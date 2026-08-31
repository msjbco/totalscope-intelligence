import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fingerprint, normalizeNwsFeatureCollection } from "./normalize-nws-alerts.mjs";
import {
  classifyMissingEvent,
  isTransientNwsStatus,
  NWS_EXCESSIVE_DURATION_MS,
  NWS_LEASE_SECONDS,
  NWS_MAX_ATTEMPTS,
  NWS_REQUEST_TIMEOUT_MS,
  retryDelayMs,
} from "./refresh-policy.mjs";

const PROJECT_REF = "ygeahqczlrwaadvlsiew";
const SOURCE = "nws";
const PARSER = "nws-alert-parser-v1";
const MAPPING = "nws-canonical-weather-v1";
const MATERIAL = /(tornado|severe thunderstorm|convective|hurricane|tropical storm|storm surge|extreme wind|high wind|wind advisory|flash flood|flood|winter storm|blizzard|ice storm|snow squall|hail)/i;
const ENDPOINT = "https://api.weather.gov/alerts/active?status=actual";

const args = new Set(process.argv.slice(2));
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userAgent = process.env.NWS_USER_AGENT;
if (
  !args.has("--confirm-staging") ||
  process.env.TOTALSCOPE_IMPORT_TARGET !== "staging" ||
  process.env.TOTALSCOPE_IMPORT_PROJECT_REF !== PROJECT_REF ||
  !url || !key || new URL(url).hostname.split(".")[0] !== PROJECT_REF
) throw new Error("Exact isolated staging confirmation required");
if (!userAgent || !userAgent.includes("@")) throw new Error("NWS_USER_AGENT with monitored contact is required");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const started = Date.now();
const observedAt = new Date().toISOString();
const leaseToken = randomUUID();
const holder = process.env.WEATHER_REFRESH_HOLDER ?? `manual:${process.pid}`;
let ingestionRunId;
let refreshId;
let leaseHeld = false;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchNws() {
  let lastError;
  for (let attempt = 0; attempt < NWS_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(ENDPOINT, {
        headers: { Accept: "application/geo+json", "User-Agent": userAgent },
        signal: AbortSignal.timeout(NWS_REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return { payload: await response.json(), retryCount: attempt };
      const error = new Error(`NWS HTTP ${response.status}`);
      if (!isTransientNwsStatus(response.status)) {
        error.transient = false;
        throw error;
      }
      lastError = error;
      if (attempt < NWS_MAX_ATTEMPTS - 1) await pause(retryDelayMs(attempt, response.headers.get("retry-after")));
    } catch (error) {
      if (error?.transient === false) throw error;
      lastError = error;
      if (attempt < NWS_MAX_ATTEMPTS - 1) await pause(retryDelayMs(attempt));
    }
  }
  throw lastError ?? new Error("NWS request failed");
}

async function runZctaIntersection(events) {
  const governed = events.filter((event) => event.geometry).map((event) => ({ source_id: event.providerEventId, geometry: event.geometry }));
  let evaluated = 0;
  let matches = 0;
  for (let offset = 0; offset < governed.length; offset += 10) {
    const response = await db.rpc("get_weather_affected_zctas", { p_alerts: governed.slice(offset, offset + 10) });
    if (response.error) throw response.error;
    evaluated += response.data.length;
    matches += response.data.reduce((sum, row) => sum + (row.zctas?.length ?? 0), 0);
  }
  return { evaluated, matches };
}

async function loadExistingEvents() {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await db.from("weather_events")
      .select("id,provider_event_id,latest_revision_sha256,provider_status,expires_at")
      .eq("weather_source_id", SOURCE)
      .order("provider_event_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (response.error) throw response.error;
    rows.push(...response.data);
    if (response.data.length < pageSize) return rows;
  }
}

await db.from("weather_sources").upsert({
  id: SOURCE,
  display_name: "National Weather Service active alerts",
  authority: "U.S. National Weather Service",
  source_url: ENDPOINT,
  expected_refresh_seconds: 1800,
  active: true,
});

const lease = await db.rpc("acquire_weather_refresh_lease", {
  p_weather_source_id: SOURCE,
  p_lease_token: leaseToken,
  p_holder: holder,
  p_lease_seconds: NWS_LEASE_SECONDS,
});
if (lease.error) throw lease.error;
if (!lease.data) {
  console.log(JSON.stringify({ status: "skipped", reason: "refresh-already-running", observedAt }));
  process.exit(0);
}
leaseHeld = true;

const staleBefore = new Date(Date.now() - NWS_LEASE_SECONDS * 1000).toISOString();
const reconciled = await db.from("ingestion_runs").update({ status: "failed", completed_at: observedAt })
  .eq("source_system", SOURCE).eq("dataset_type", "active_alerts").eq("status", "running").lt("started_at", staleBefore).select("id");
if (reconciled.error) throw reconciled.error;
const refresh = await db.from("weather_provider_refreshes").insert({
  weather_source_id: SOURCE,
  operation: `active-alert-refresh:${process.env.WEATHER_REFRESH_TRIGGER ?? "manual"}`,
  attempted_at: observedAt,
  status: "running",
}).select("id").single();
if (refresh.error) throw refresh.error;
refreshId = refresh.data.id;

try {
  const { payload, retryCount } = await fetchNws();
  const raw = JSON.stringify(payload);
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  const events = normalizeNwsFeatureCollection(payload, observedAt);
  const contractHash = fingerprint({ source: "nws", version: "v1", type: "FeatureCollection" });
  const contractUpsert = await db.from("source_contracts").upsert({
    source_system: SOURCE, dataset_type: "active_alerts", contract_version: "nws-alerts-v1",
    schema_sha256: contractHash, definition: { source: "api.weather.gov", payload: "GeoJSON FeatureCollection", geometry: ["Polygon", "MultiPolygon", null] },
    effective_from: "2026-01-01T00:00:00Z", approval_status: "approved", approved_at: "2026-01-01T00:00:00Z",
  }, { onConflict: "source_system,dataset_type,contract_version" }).select("id").single();
  if (contractUpsert.error) throw contractUpsert.error;

  let artifact = await db.from("source_artifacts").select("id").eq("source_system", SOURCE).eq("sha256", payloadHash).maybeSingle();
  if (artifact.error) throw artifact.error;
  if (!artifact.data) {
    artifact = await db.from("source_artifacts").insert({
      source_contract_id: contractUpsert.data.id, source_system: SOURCE, artifact_type: "api_response",
      filename: `nws-active-${observedAt}.json`, sha256: payloadHash, byte_size: Buffer.byteLength(raw),
      covered_from: events.map((x) => x.effectiveAt).sort()[0] ?? observedAt,
      covered_to: events.map((x) => x.expiresAt).sort().at(-1) ?? observedAt,
      received_at: observedAt, protected_storage_pointer: `supabase://ingestion-records/nws/${payloadHash}`,
      metadata: { endpoint: "/alerts/active", official: true },
    }).select("id").single();
    if (artifact.error) throw artifact.error;
  }

  let run = await db.from("ingestion_runs").select("id,status").eq("source_system", SOURCE).eq("dataset_type", "active_alerts")
    .eq("artifact_set_fingerprint", payloadHash).eq("parser_version", PARSER).eq("mapping_version", MAPPING).maybeSingle();
  if (run.error) throw run.error;
  if (!run.data) {
    run = await db.from("ingestion_runs").insert({
      source_system: SOURCE, dataset_type: "active_alerts", ingestion_mode: "incremental",
      covered_from: events.map((x) => x.effectiveAt).sort()[0] ?? observedAt,
      covered_to: events.map((x) => x.expiresAt).sort().at(-1) ?? observedAt,
      source_watermark: observedAt, artifact_set_fingerprint: payloadHash, parser_version: PARSER, mapping_version: MAPPING,
      status: "running", execution_actor: holder, source_record_count: events.length,
      metadata: { endpoint: "official NWS active alerts" },
    }).select("id,status").single();
    if (run.error) throw run.error;
  }
  ingestionRunId = run.data.id;

  const existingLink = await db.from("ingestion_run_artifacts").select("ingestion_run_id")
    .eq("ingestion_run_id", run.data.id).eq("source_artifact_id", artifact.data.id).maybeSingle();
  if (existingLink.error) throw existingLink.error;
  if (!existingLink.data) {
    const linked = await db.from("ingestion_run_artifacts").insert({ ingestion_run_id: run.data.id, source_artifact_id: artifact.data.id, logical_table: "active_alerts", artifact_sequence: 0 });
    if (linked.error) throw linked.error;
  }

  const existing = await loadExistingEvents();
  const byProvider = new Map(existing.map((row) => [row.provider_event_id, row]));
  const counts = { new: 0, changed: 0, unchanged: 0, closed: 0, expired: 0, duplicateProviderRecords: 0, polygon: 0, multiPolygon: 0, withoutGeometry: 0, opportunities: 0 };
  const activeIds = new Set();

  for (const [index, event] of events.entries()) {
    if (activeIds.has(event.providerEventId)) counts.duplicateProviderRecords += 1;
    activeIds.add(event.providerEventId);
    if (event.geometry?.type === "Polygon") counts.polygon += 1;
    else if (event.geometry?.type === "MultiPolygon") counts.multiPolygon += 1;
    else counts.withoutGeometry += 1;
    const sourceLocator = `features/${index}/${event.providerEventId}`;
    const rowHash = fingerprint(payload.features[index]);
    let record = await db.from("ingestion_records").select("id").eq("source_artifact_id", artifact.data.id)
      .eq("logical_table", "active_alerts").eq("source_locator", sourceLocator).maybeSingle();
    if (record.error) throw record.error;
    if (!record.data) {
      record = await db.from("ingestion_records").insert({
        source_artifact_id: artifact.data.id, ingestion_run_id: run.data.id, logical_table: "active_alerts",
        source_locator: sourceLocator, stable_source_key: event.providerEventId, raw_payload: payload.features[index], row_sha256: rowHash,
        source_observed_at: event.sourceObservedAt, source_timezone: "UTC", source_timezone_status: "explicit_offset", parsing_status: "parsed",
      }).select("id").single();
      if (record.error) throw record.error;
    }
    const prior = byProvider.get(event.providerEventId);
    const values = {
      weather_source_id: SOURCE, provider_event_id: event.providerEventId, lifecycle_status: event.lifecycleStatus,
      event_name: event.eventName, provider_status: event.providerStatus, message_type: event.messageType,
      severity: event.severity, certainty: event.certainty, urgency: event.urgency, headline: event.headline,
      area_description: event.areaDescription, sent_at: event.sentAt, effective_at: event.effectiveAt,
      onset_at: event.onsetAt, expires_at: event.expiresAt, ends_at: event.endsAt, geometry_json: event.geometry,
      source_url: event.sourceUrl, source_observed_at: event.sourceObservedAt, retrieved_at: observedAt,
      latest_revision_sha256: event.revisionSha256, latest_ingestion_record_id: record.data.id,
      ...(!prior ? { first_ingestion_record_id: record.data.id } : {}),
    };
    let saved;
    if (prior) {
      saved = await db.from("weather_events").update(values).eq("id", prior.id).select("id").single();
      counts[event.revisionSha256 === prior.latest_revision_sha256 ? "unchanged" : "changed"] += 1;
    } else {
      saved = await db.from("weather_events").insert(values).select("id").single();
      counts.new += 1;
    }
    if (saved.error) throw saved.error;
    byProvider.set(event.providerEventId, {
      id: saved.data.id,
      provider_event_id: event.providerEventId,
      latest_revision_sha256: event.revisionSha256,
      provider_status: event.providerStatus,
      expires_at: event.expiresAt,
    });
    if (event.geometry) {
      const geo = await db.rpc("set_weather_event_governed_geometry", { p_event_id: saved.data.id, p_geometry: event.geometry });
      if (geo.error) throw geo.error;
    }
    const revision = await db.from("weather_event_revisions").upsert({
      weather_event_id: saved.data.id, ingestion_record_id: record.data.id, revision_sha256: event.revisionSha256,
      normalized_payload: event, source_observed_at: event.sourceObservedAt,
    }, { onConflict: "weather_event_id,revision_sha256", ignoreDuplicates: true });
    if (revision.error) throw revision.error;
    if (MATERIAL.test(event.eventName)) {
      const level = String(event.urgency).toLowerCase() === "immediate" || String(event.severity).toLowerCase() === "extreme" ? "active"
        : String(event.severity).toLowerCase() === "severe" ? "high" : String(event.urgency).toLowerCase() === "expected" ? "elevated" : "monitor";
      const opportunity = await db.from("weather_opportunities").upsert({ weather_event_id: saved.data.id, classification: level, classifier_version: "weather-material-v1", rationale: [`Official NWS ${event.eventName}`], classified_at: observedAt }, { onConflict: "weather_event_id" });
      if (opportunity.error) throw opportunity.error;
      counts.opportunities += 1;
    }
  }

  const missing = existing.filter((row) => row.provider_status === "Actual" && !activeIds.has(row.provider_event_id));
  for (const row of missing) {
    const disposition = classifyMissingEvent(row, observedAt);
    const result = await db.from("weather_events").update({ provider_status: "Inactive", retrieved_at: observedAt }).eq("id", row.id);
    if (result.error) throw result.error;
    counts[disposition] += 1;
  }

  const zcta = await runZctaIntersection(events);
  const exposure = await db.rpc("refresh_weather_client_exposures", { p_near_radius_km: 50 });
  if (exposure.error) throw exposure.error;
  const completedAt = new Date().toISOString();
  const completed = await db.from("ingestion_runs").update({ status: "completed", completed_at: completedAt, accepted_record_count: events.length }).eq("id", run.data.id);
  if (completed.error) throw completed.error;
  const durationMs = Date.now() - started;
  const refreshDone = await db.from("weather_provider_refreshes").update({
    completed_at: completedAt, status: "succeeded", records_returned: events.length, retry_count: retryCount,
    latency_ms: durationMs, ingestion_run_id: run.data.id,
  }).eq("id", refreshId);
  if (refreshDone.error) throw refreshDone.error;
  const result = {
    status: "succeeded", retrieved: events.length, ...counts, persistedGeometry: counts.polygon + counts.multiPolygon,
    zcta, exposure: exposure.data, retryCount, durationMs, excessiveDuration: durationMs > NWS_EXCESSIVE_DURATION_MS,
    reconciledInterruptedRuns: reconciled.data?.length ?? 0, observedAt, payloadHash,
  };
  if (result.excessiveDuration) console.warn(`Weather refresh exceeded governed duration threshold: ${durationMs}ms`);
  console.log(JSON.stringify(result));
} catch (error) {
  if (ingestionRunId) await db.from("ingestion_runs").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", ingestionRunId).eq("status", "running");
  if (refreshId) await db.from("weather_provider_refreshes").update({
    completed_at: new Date().toISOString(), status: "failed", latency_ms: Date.now() - started,
    error_classification: error instanceof Error ? error.name : "Error",
    sanitized_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown failure",
  }).eq("id", refreshId);
  throw error;
} finally {
  if (leaseHeld) {
    const released = await db.rpc("release_weather_refresh_lease", { p_weather_source_id: SOURCE, p_lease_token: leaseToken });
    if (released.error) console.error("Weather refresh lease release failed", released.error.message);
  }
}
