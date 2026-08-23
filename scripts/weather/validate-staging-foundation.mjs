import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const REF = "ygeahqczlrwaadvlsiew";
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!process.argv.includes("--confirm-staging") || !url || !serviceKey || !anonKey || new URL(url).hostname.split(".")[0] !== REF) {
  throw new Error("Exact isolated staging confirmation and credentials are required");
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, options);
const admin = createClient(url, anonKey, options);
const password = `Weather-validation-${randomUUID()}!`;
const email = `weather-foundation-${Date.now()}@example.invalid`;
let userId;

try {
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  assert.ifError((await service.from("application_profiles").update({ role: "staging_admin" }).eq("user_id", userId)).error);
  assert.ifError((await admin.auth.signInWithPassword({ email, password })).error);

  const activeEvents = await service.from("weather_events").select("id,provider_event_id,event_name,geometry_json,provider_status,expires_at").eq("provider_status", "Actual").gt("expires_at", new Date().toISOString()).limit(1000);
  assert.ifError(activeEvents.error);
  const events = activeEvents.data.filter((event) => event.geometry_json);
  assert.ok(events.length > 0, "at least one active governed NWS geometry is required");
  const alerts = events.map((event) => ({ source_id: event.id, geometry: event.geometry_json }));
  const intersections = await admin.rpc("get_weather_affected_zctas", { p_alerts: alerts });
  assert.ifError(intersections.error);
  assert.equal(intersections.data.length, alerts.length);
  const zctaByEvent = new Map(intersections.data.map((row) => [row.source_id, row.zctas?.length ?? 0]));
  assert.ok([...zctaByEvent.values()].some((count) => count > 0), "real NWS geometry must intersect governed ZCTAs");

  const exposureRefresh = await service.rpc("refresh_weather_client_exposures", { p_near_radius_km: 50 });
  assert.ifError(exposureRefresh.error);
  const opportunities = await service.from("weather_opportunities").select("id,weather_event_id").in("weather_event_id", activeEvents.data.map((event) => event.id)).limit(1000);
  assert.ifError(opportunities.error);
  const opportunityIds = opportunities.data.map((row) => row.id);
  const exposurePages = [];
  for (let from = 0; ; from += 1000) {
    const page = await service.from("weather_client_exposures").select("weather_opportunity_id,client_id,branch_id,exposure_status").in("weather_opportunity_id", opportunityIds).range(from, from + 999);
    assert.ifError(page.error);
    exposurePages.push(...page.data);
    if (page.data.length < 1000) break;
  }
  const clientIds = [...new Set(exposurePages.map((row) => row.client_id))];
  const branchIds = [...new Set(exposurePages.map((row) => row.branch_id))];
  const clients = clientIds.length ? await service.from("clients").select("id,lifecycle_status,active").in("id", clientIds) : { data: [], error: null };
  const branches = branchIds.length ? await service.from("branches").select("id,client_id,accepted_geocode_attempt_id,active").in("id", branchIds) : { data: [], error: null };
  assert.ifError(clients.error);
  assert.ifError(branches.error);
  assert.equal(clients.data.every((row) => row.active && row.lifecycle_status === "current"), true, "inactive clients must be excluded");
  const branchById = new Map(branches.data.map((row) => [row.id, row]));
  assert.equal(exposurePages.every((row) => branchById.get(row.branch_id)?.client_id === row.client_id && branchById.get(row.branch_id)?.accepted_geocode_attempt_id), true, "every exposure must use an accepted same-client branch point");
  assert.equal(Object.values(exposureRefresh.data).reduce((sum, count) => sum + count, 0), exposurePages.length, "database aggregate and paginated current exposure evidence must agree");

  const eventByOpportunity = new Map(opportunities.data.map((row) => [row.id, row.weather_event_id]));
  const representative = exposurePages.map((row) => eventByOpportunity.get(row.weather_opportunity_id)).find((eventId) => (zctaByEvent.get(eventId) ?? 0) > 0);
  assert.ok(representative, "one governed event must support both ZCTA and client-exposure results");

  const dispositions = await service.from("client_location_geocode_dispositions").select("disposition").limit(100);
  assert.ifError(dispositions.error);
  assert.equal(dispositions.data.length, 12);
  const dispositionCounts = Object.fromEntries([...new Set(dispositions.data.map((row) => row.disposition))].sort().map((value) => [value, dispositions.data.filter((row) => row.disposition === value).length]));
  const administrativeReview = await service.from("client_location_geocode_dispositions").select("client_id").eq("disposition", "administrative_data_review").single();
  assert.ifError(administrativeReview.error);
  const administrativeClient = await service.from("clients").select("id,source_status_code,lifecycle_status").eq("id", administrativeReview.data.client_id).single();
  assert.ifError(administrativeClient.error);
  assert.equal(administrativeClient.data.source_status_code, "A", "authoritative source status must remain unchanged");
  const administrativeBranches = await service.from("branches").select("accepted_geocode_attempt_id").eq("client_id", administrativeClient.data.id);
  assert.ifError(administrativeBranches.error);
  assert.equal(administrativeBranches.data.every((row) => row.accepted_geocode_attempt_id === null), true, "administrative-review client must remain excluded from exposure coordinates");
  assert.equal(exposurePages.some((row) => row.client_id === administrativeClient.data.id), false, "administrative-review client must remain excluded from exposure results");
  const acceptedBranches = await service.from("branches").select("id", { count: "exact", head: true }).not("accepted_geocode_attempt_id", "is", null);
  const geocodingAttempts = await service.from("client_location_geocode_attempts").select("id", { count: "exact", head: true }).eq("provider", "geocodio");
  assert.ifError(acceptedBranches.error);
  assert.ifError(geocodingAttempts.error);
  const refreshHistory = await service.from("weather_provider_refreshes").select("status,records_returned,error_classification").eq("weather_source_id", "nws").order("attempted_at", { ascending: false }).limit(10);
  const ingestionRuns = await service.from("ingestion_runs").select("status,source_record_count,accepted_record_count").eq("source_system", "nws").eq("dataset_type", "active_alerts").limit(100);
  const revisions = await service.from("weather_event_revisions").select("id", { count: "exact", head: true });
  assert.ifError(refreshHistory.error);
  assert.ifError(ingestionRuns.error);
  assert.ifError(revisions.error);
  assert.equal(refreshHistory.data[0]?.status, "succeeded", "latest provider refresh must be successful");
  assert.ok(refreshHistory.data.some((row) => row.status === "failed"), "failed provider refreshes must remain explicitly visible");
  assert.ifError((await service.auth.admin.deleteUser(userId)).error);
  userId = undefined;

  console.log(JSON.stringify({
    activeEventsWithGeometry: events.length,
    zctaEventsEvaluated: intersections.data.length,
    zctaMatches: intersections.data.reduce((sum, row) => sum + (row.zctas?.length ?? 0), 0),
    exposureCounts: exposureRefresh.data,
    exposureRows: exposurePages.length,
    inactiveClientExposureRows: clients.data.filter((row) => !row.active || row.lifecycle_status !== "current").length,
    sameGovernedEventProof: { eventId: representative, zctaCount: zctaByEvent.get(representative), exposureRows: exposurePages.filter((row) => eventByOpportunity.get(row.weather_opportunity_id) === representative).length },
    dispositions: dispositionCounts,
    acceptedCoordinatePointers: acceptedBranches.count,
    immutableGeocodioAttempts: geocodingAttempts.count,
    administrativeReviewClient: { sourceStatusCode: administrativeClient.data.source_status_code, lifecycleStatus: administrativeClient.data.lifecycle_status, exposureRows: 0 },
    refreshHistory: Object.fromEntries(["succeeded", "failed", "running"].map((status) => [status, refreshHistory.data.filter((row) => row.status === status).length])),
    ingestionRuns: Object.fromEntries(["completed", "running", "failed"].map((status) => [status, ingestionRuns.data.filter((row) => row.status === status).length])),
    immutableWeatherRevisions: revisions.count,
    temporaryUsersRemoved: true,
  }));
} finally {
  if (userId) await service.auth.admin.deleteUser(userId);
}
