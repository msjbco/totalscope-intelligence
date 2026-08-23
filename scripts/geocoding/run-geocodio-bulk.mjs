import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { addressFingerprint, normalizeGeocodioResponse, requestFingerprint } from "./geocodio-core.mjs";

const EXPECTED_REF = "ygeahqczlrwaadvlsiew";
const PROVIDER = "geocodio";
const PROVIDER_VERSION = "v2-normalizer-2";
const RUN_VERSION = "geocodio-governed-bulk-v1";
const DEFAULT_BATCH_SIZE = 20;
const DEFERRED_DISPOSITIONS = new Set([
  "unresolved_coordinate",
  "source_verification_required",
  "administrative_data_review",
  "source_data_correction_required",
  "rejected_po_box",
]);

const args = Object.fromEntries(process.argv.slice(3).map((value, index, values) =>
  value.startsWith("--") ? [value.slice(2), values[index + 1]?.startsWith("--") ? true : values[index + 1]] : null
).filter(Boolean));
const mode = process.argv[2] ?? "inspect";
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function loadLocalSecret() {
  if (process.env.GEOCODIO_API_KEY) return process.env.GEOCODIO_API_KEY;
  if (!existsSync(".env.local")) return null;
  const text = await readFile(".env.local", "utf8");
  return text.match(/^GEOCODIO_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? null;
}

function guard() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.TOTALSCOPE_IMPORT_TARGET !== "staging" || process.env.TOTALSCOPE_IMPORT_PROJECT_REF !== EXPECTED_REF || args["confirm-project-ref"] !== EXPECTED_REF) {
    throw new Error("Exact isolated staging target confirmation is required");
  }
  if (!url || !key || new URL(url).hostname.split(".")[0] !== EXPECTED_REF) {
    throw new Error("Supabase credentials do not match the approved staging project");
  }
  if (!new Set(["inspect", "run", "exposure"]).has(mode)) throw new Error("Mode must be inspect, run, or exposure");
  return { url, key };
}

async function allRows(db, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const result = await db.from(table).select(columns).range(from, from + 499);
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}

function requestFor(row) {
  return {
    streetAddress: row.street_address,
    city: row.city,
    stateCode: row.state_code,
    postalCode: row.postal_code,
    countryCode: "US",
  };
}

function validRequest(request) {
  return Boolean(
    String(request.streetAddress ?? "").trim() &&
    String(request.city ?? "").trim() &&
    /^[A-Z]{2}$/.test(String(request.stateCode ?? "").trim().toUpperCase()) &&
    /^\d{5}(?:-\d{4})?$/.test(String(request.postalCode ?? "").trim()) &&
    !/\bP(?:OST)?\.?\s*O(?:FFICE)?\.?\s+BOX\b/i.test(String(request.streetAddress ?? ""))
  );
}

async function governedState(db) {
  const [branches, clients, attempts, dispositions] = await Promise.all([
    allRows(db, "branches", "id,client_id,street_address,city,state_code,postal_code,accepted_geocode_attempt_id,active,restricted_master_data"),
    allRows(db, "clients", "id,lifecycle_status,active"),
    allRows(db, "client_location_geocode_attempts", "id,client_id,branch_id,address_fingerprint,request_fingerprint,provider,provider_version,provider_result_id,provider_precision,canonical_precision,confidence,state_matches,postal_code_matches,result_status,review_status,review_reason,raw_provider_payload,attempted_at"),
    allRows(db, "client_location_geocode_dispositions", "geocode_attempt_id,branch_id,client_id,disposition"),
  ]);
  const clientById = new Map(clients.map((row) => [row.id, row]));
  const attemptsById = new Map(attempts.map((row) => [row.id, row]));
  const attemptsByLocation = new Map();
  for (const attempt of attempts.filter((row) => row.provider === PROVIDER)) {
    const values = attemptsByLocation.get(attempt.branch_id) ?? [];
    values.push(attempt);
    attemptsByLocation.set(attempt.branch_id, values);
  }
  const dispositionByAttempt = new Map(dispositions.map((row) => [row.geocode_attempt_id, row.disposition]));
  const classified = branches.filter((row) => row.restricted_master_data).map((row) => {
    const request = requestFor(row);
    const fingerprint = addressFingerprint(request);
    const client = clientById.get(row.client_id);
    const currentAttempts = (attemptsByLocation.get(row.id) ?? []).filter((attempt) => attempt.address_fingerprint === fingerprint);
    const acceptedAttempt = attemptsById.get(row.accepted_geocode_attempt_id);
    const acceptedCurrent = Boolean(acceptedAttempt && acceptedAttempt.address_fingerprint === fingerprint);
    const deferredGoverned = (attemptsByLocation.get(row.id) ?? []).some((attempt) => DEFERRED_DISPOSITIONS.has(dispositionByAttempt.get(attempt.id)));
    const existingCurrent = currentAttempts.sort((a, b) => String(b.attempted_at).localeCompare(String(a.attempted_at)))[0] ?? null;
    const invalid = !validRequest(request);
    const lifecycle = client?.lifecycle_status ?? "unknown";
    const category = acceptedCurrent ? "accepted" : deferredGoverned ? "deferred" : invalid ? "invalid" : existingCurrent ? "existing_attempt" : "eligible";
    return { row, request, fingerprint, client, lifecycle, category, existingCurrent };
  });
  return { classified, attempts, dispositions };
}

function aggregate(state) {
  const count = (predicate) => state.classified.filter(predicate).length;
  const eligible = state.classified.filter((item) => item.category === "eligible");
  const lifecycleCounts = Object.fromEntries(["current", "inactive", "deleted", "unknown"].map((lifecycle) => [lifecycle, eligible.filter((item) => item.lifecycle === lifecycle).length]));
  const acceptedByLifecycle = Object.fromEntries(["current", "inactive", "deleted", "unknown"].map((lifecycle) => [lifecycle, count((item) => item.category === "accepted" && item.lifecycle === lifecycle)]));
  const existingAttemptReasons = Object.fromEntries([...new Set(state.classified.filter((item) => item.category === "existing_attempt").map((item) => item.existingCurrent?.review_reason ?? "unknown"))].map((reason) => [reason, count((item) => item.category === "existing_attempt" && (item.existingCurrent?.review_reason ?? "unknown") === reason)]));
  const dispositionCounts = Object.fromEntries([...new Set(state.dispositions.map((row) => row.disposition))].map((disposition) => [disposition, state.dispositions.filter((row) => row.disposition === disposition).length]));
  const acceptedWithDeferredDisposition = state.classified.filter((item) => item.category === "accepted").map((item) => {
    const values = state.dispositions.filter((row) => row.branch_id === item.row.id && DEFERRED_DISPOSITIONS.has(row.disposition)).map((row) => row.disposition);
    return values.length ? values : null;
  }).filter(Boolean).flat();
  const suiteOrUnit = state.classified.filter((item) => /\b(?:SUITE|STE|UNIT|#)\b/i.test(item.row.street_address ?? ""));
  const addressCounts = new Map();
  for (const item of state.classified) {
    const key = String(item.row.street_address ?? "").trim().toUpperCase().replace(/\s+/g, " ");
    addressCounts.set(key, (addressCounts.get(key) ?? 0) + 1);
  }
  const repeatedAddress = state.classified.filter((item) => (addressCounts.get(String(item.row.street_address ?? "").trim().toUpperCase().replace(/\s+/g, " ")) ?? 0) > 1);
  return {
    runVersion: RUN_VERSION,
    totalGovernedLocations: state.classified.length,
    acceptedCurrentFingerprints: count((item) => item.category === "accepted"),
    deferredReviewLocations: count((item) => item.category === "deferred"),
    invalidOrIncompleteLocations: count((item) => item.category === "invalid"),
    existingCurrentAttemptsWithoutAcceptedPointer: count((item) => item.category === "existing_attempt"),
    exactEligibleUnprocessed: eligible.length,
    eligibleByLifecycle: lifecycleCounts,
    acceptedByLifecycle,
    existingAttemptReasons,
    dispositionCounts,
    acceptedWithDeferredDisposition: Object.fromEntries([...new Set(acceptedWithDeferredDisposition)].map((disposition) => [disposition, acceptedWithDeferredDisposition.filter((value) => value === disposition).length])),
    sourcePatternQuality: {
      suiteOrUnitTotal: suiteOrUnit.length,
      suiteOrUnitAccepted: suiteOrUnit.filter((item) => item.category === "accepted").length,
      repeatedAddressLocations: repeatedAddress.length,
      repeatedAddressAccepted: repeatedAddress.filter((item) => item.category === "accepted").length,
    },
  };
}

async function geocode(apiKey, request) {
  const url = new URL("https://api.geocod.io/v2/geocode");
  url.searchParams.set("q", [request.streetAddress, request.city, request.stateCode, request.postalCode, "US"].filter(Boolean).join(", "));
  url.searchParams.set("api_key", apiKey);
  for (let retry = 0; retry < 3; retry += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } });
      if (response.ok) return normalizeGeocodioResponse(request, await response.json());
      if (response.status < 500 && response.status !== 429) throw new Error(`provider_http_${response.status}`);
      if (retry === 2) throw new Error(`provider_http_${response.status}`);
    } catch (error) {
      if (retry === 2) throw error;
    }
    await sleep(750 * (retry + 1));
  }
  throw new Error("provider_retry_exhausted");
}

function attemptInsert(item, result, requestHash, providerCalled) {
  return {
    client_id: item.row.client_id,
    branch_id: item.row.id,
    address_fingerprint: item.fingerprint,
    request_fingerprint: requestHash,
    provider: PROVIDER,
    provider_version: PROVIDER_VERSION,
    provider_result_id: result.providerReference,
    returned_formatted_address: result.formattedAddress,
    returned_city: result.returnedCity,
    returned_state_code: result.returnedStateCode,
    returned_postal_code: result.returnedPostalCode,
    latitude: result.latitude,
    longitude: result.longitude,
    provider_precision: result.providerPrecision,
    canonical_precision: result.precision,
    confidence: result.confidence,
    match_type: result.matchType,
    component_match_metadata: result.componentMetadata,
    state_matches: result.stateMatches,
    postal_code_matches: result.postalCodeMatches,
    result_status: result.status,
    review_status: result.reviewStatus,
    review_reason: result.reviewReason,
    raw_provider_payload: result.rawProviderPayload,
    source_provenance: { runVersion: RUN_VERSION, normalizerVersion: PROVIDER_VERSION, providerCalled },
  };
}

async function accept(db, item, attempt) {
  if (attempt.review_status !== "auto_accepted") return;
  const current = await db.from("branches").select("accepted_geocode_attempt_id").eq("id", item.row.id).eq("client_id", item.row.client_id).single();
  if (current.error) throw current.error;
  if (current.data.accepted_geocode_attempt_id) return;
  const update = await db.from("branches").update({
    accepted_geocode_attempt_id: attempt.id,
    latitude: attempt.latitude,
    longitude: attempt.longitude,
    location_precision: attempt.canonical_precision,
    geocoding_status: "matched",
    geocoding_provider: PROVIDER,
    geocoded_at: attempt.attempted_at,
  }).eq("id", item.row.id).eq("client_id", item.row.client_id).is("accepted_geocode_attempt_id", null);
  if (update.error) throw update.error;
}

async function execute(db, state, apiKey) {
  const eligible = state.classified.filter((item) => item.category === "eligible");
  const batchSize = Math.max(1, Math.min(50, Number(args["batch-size"] ?? DEFAULT_BATCH_SIZE)));
  const metrics = { providerCalls: 0, reusedEvidence: 0, autoAccepted: 0, reviewRequired: 0, rejected: 0, providerErrors: 0 };
  for (let offset = 0; offset < eligible.length; offset += batchSize) {
    const batch = eligible.slice(offset, offset + batchSize);
    for (const item of batch) {
      const requestHash = requestFingerprint(item.request, PROVIDER, PROVIDER_VERSION, item.row.id);
      const exact = await db.from("client_location_geocode_attempts").select("*").eq("provider", PROVIDER).eq("request_fingerprint", requestHash).maybeSingle();
      if (exact.error) throw exact.error;
      let attempt = exact.data;
      if (!attempt) {
        const prior = await db.from("client_location_geocode_attempts").select("raw_provider_payload").eq("provider", PROVIDER).eq("branch_id", item.row.id).eq("address_fingerprint", item.fingerprint).order("attempted_at", { ascending: false }).limit(1).maybeSingle();
        if (prior.error) throw prior.error;
        let result;
        let providerCalled = false;
        if (prior.data?.raw_provider_payload?.results) {
          result = normalizeGeocodioResponse(item.request, prior.data.raw_provider_payload);
          metrics.reusedEvidence += 1;
        } else {
          providerCalled = true;
          metrics.providerCalls += 1;
          try {
            result = await geocode(apiKey, item.request);
          } catch (error) {
            result = { status: "provider_error", latitude: null, longitude: null, precision: "unknown", providerReference: null, confidence: null, providerPrecision: null, matchType: null, formattedAddress: null, returnedCity: null, returnedStateCode: null, returnedPostalCode: null, stateMatches: null, postalCodeMatches: null, reviewStatus: "rejected", reviewReason: "provider_error", componentMetadata: { error: error instanceof Error ? error.message : "provider_error" }, rawProviderPayload: {} };
          }
        }
        const inserted = await db.from("client_location_geocode_attempts").insert(attemptInsert(item, result, requestHash, providerCalled)).select("*").single();
        if (inserted.error) throw inserted.error;
        attempt = inserted.data;
        if (providerCalled) await sleep(250);
      } else {
        metrics.reusedEvidence += 1;
      }
      await accept(db, item, attempt);
      if (attempt.review_status === "auto_accepted") metrics.autoAccepted += 1;
      else if (attempt.review_status === "review_required") metrics.reviewRequired += 1;
      else metrics.rejected += 1;
      if (attempt.review_reason === "provider_error") metrics.providerErrors += 1;
    }
    console.log(JSON.stringify({ progress: { processed: Math.min(offset + batch.length, eligible.length), total: eligible.length, batchSize }, providerCalls: metrics.providerCalls }));
  }
  return metrics;
}

function quality(attempts) {
  const rows = attempts.filter((row) => row.provider === PROVIDER && row.provider_version === PROVIDER_VERSION);
  const count = (predicate) => rows.filter(predicate).length;
  return {
    totalCurrentNormalizerAttempts: rows.length,
    rooftop: count((row) => row.canonical_precision === "rooftop"),
    parcel: count((row) => row.canonical_precision === "parcel"),
    interpolatedAddress: count((row) => row.canonical_precision === "interpolated_address"),
    streetOrWorse: count((row) => ["street", "zip", "city", "county", "state", "unknown"].includes(row.canonical_precision)),
    autoAccepted: count((row) => row.review_status === "auto_accepted"),
    reviewRequired: count((row) => row.review_status === "review_required"),
    rejected: count((row) => row.review_status === "rejected"),
    stateMismatches: count((row) => row.state_matches === false),
    zipMismatches: count((row) => row.postal_code_matches === false),
    noMatch: count((row) => row.review_reason === "no_match"),
    providerErrors: count((row) => row.review_reason === "provider_error"),
    suiteOrUnitAccepted: count((row) => row.review_status === "auto_accepted" && row.component_match_metadata?.unitMatches === true),
  };
}

const { url, key } = guard();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let state = await governedState(db);
const before = aggregate(state);
if (mode === "inspect") {
  const users = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  const probePrefixes = ["client-security-", "geocoding-hosted-security-", "weather-security-", "weather-hosted-security-", "weather-foundation-"];
  const temporaryProbeUsers = users.data.users.filter((user) => probePrefixes.some((prefix) => user.email?.startsWith(prefix))).length;
  const probeSources = await db.from("weather_sources").select("id", { count: "exact", head: true }).like("id", "weather-security-%");
  if (probeSources.error) throw probeSources.error;
  console.log(JSON.stringify({ target: EXPECTED_REF, mode, before, quality: quality(state.attempts), cleanup: { temporaryProbeUsers, weatherProbeSources: probeSources.count } }));
  process.exit(0);
}
if (mode === "run") {
  const apiKey = await loadLocalSecret();
  if (!apiKey) throw new Error("GEOCODIO_API_KEY is not configured");
  const execution = await execute(db, state, apiKey);
  state = await governedState(db);
  const after = aggregate(state);
  const reviewQueue = state.classified.filter((item) => ["deferred", "existing_attempt"].includes(item.category)).map((item) => ({ locationId: item.row.id, clientId: item.row.client_id, lifecycle: item.lifecycle, category: item.category, reason: item.existingCurrent?.review_reason ?? "governed_disposition" }));
  await mkdir(".artifacts", { recursive: true });
  await writeFile(".artifacts/geocodio-governed-bulk-summary.json", JSON.stringify({ target: EXPECTED_REF, before, execution, after, quality: quality(state.attempts), reviewQueue }, null, 2));
  console.log(JSON.stringify({ target: EXPECTED_REF, mode, before, execution, after, quality: quality(state.attempts), privateReviewQueueCount: reviewQueue.length }));
  process.exit(0);
}
const refreshed = await db.rpc("refresh_weather_client_exposures", { p_near_radius_km: 50 });
if (refreshed.error) throw refreshed.error;
const exposures = await allRows(db, "weather_client_exposures", "exposure_status,client_id,branch_id,weather_opportunity_id");
const clients = await allRows(db, "clients", "id,lifecycle_status");
const lifecycleById = new Map(clients.map((row) => [row.id, row.lifecycle_status]));
const invalidLifecycleExposures = exposures.filter((row) => lifecycleById.get(row.client_id) !== "current").length;
console.log(JSON.stringify({ target: EXPECTED_REF, mode, refresh: refreshed.data, persistedExposureCount: exposures.length, invalidLifecycleExposures }));
