import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("Weather database security probe requires local Supabase URL, service-role key, and anon key.");

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, options);
const anonymous = createClient(url, anonKey, options);
const viewer = createClient(url, anonKey, options);
const email = `weather-security-${Date.now()}@example.invalid`;
const password = `Weather-local-${crypto.randomUUID()}!`;
let userId;
let weatherEventId;
let weatherOpportunityId;
const sourceId = `weather-security-${Date.now()}`;

try {
  const anonymousRead = await anonymous.from("weather_internal_active_alerts").select("id").limit(1);
  assert.ok(anonymousRead.error, "anonymous callers must not read internal weather intelligence");
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  assert.ifError((await viewer.auth.signInWithPassword({ email, password })).error);
  const viewerWeather = await viewer.from("weather_events").select("id").limit(1);
  assert.ifError(viewerWeather.error);
  assert.equal(viewerWeather.data?.length, 0, "ordinary viewers must receive no weather rows");
  const viewerProspects = await viewer.from("contractor_prospects").select("id,business_name").limit(1);
  assert.ifError(viewerProspects.error);
  assert.equal(viewerProspects.data?.length, 0, "ordinary viewers must receive no prospect rows");
  const viewerBranches = await viewer.rpc("get_weather_internal_branch_locations");
  assert.ok(viewerBranches.error, "ordinary viewers must not invoke the internal branch-location RPC");
  const viewerClientLocations = await viewer.rpc("get_weather_internal_client_locations_v2");
  assert.ok(viewerClientLocations.error, "ordinary viewers must not invoke governed client geography RPC");
  const viewerGeometryMutation = await viewer.rpc("set_weather_event_governed_geometry", {
    p_event_id: crypto.randomUUID(),
    p_geometry: { type: "Polygon", coordinates: [[[-97, 32], [-96, 32], [-96, 33], [-97, 33], [-97, 32]]] },
  });
  assert.ok(viewerGeometryMutation.error, "ordinary viewers must not set governed Weather geometry");
  const viewerExposureRefresh = await viewer.rpc("refresh_weather_client_exposures", { p_near_radius_km: 50 });
  assert.ok(viewerExposureRefresh.error, "ordinary viewers must not evaluate internal client exposures");
  const viewerMutation = await viewer.from("weather_events").delete().eq("provider_event_id", "never");
  assert.ok(viewerMutation.error, "browser mutations must be denied");

  const ingestion = await service.from("ingestion_records").select("id").limit(1).single();
  assert.ifError(ingestion.error);
  const source = await service.from("weather_sources").insert({ id: sourceId, display_name: "Security probe", authority: "Test", source_url: "https://example.invalid/weather-security", expected_refresh_seconds: 120 }).select("id").single();
  assert.ifError(source.error);
  const now = new Date();
  const later = new Date(now.getTime() + 3_600_000);
  const event = await service.from("weather_events").insert({
    weather_source_id: sourceId, provider_event_id: sourceId, lifecycle_status: "warning",
    event_name: "Security Probe Warning", provider_status: "Actual", message_type: "Alert",
    sent_at: now.toISOString(), effective_at: now.toISOString(), expires_at: later.toISOString(),
    source_url: "https://example.invalid/weather-security", source_observed_at: now.toISOString(), retrieved_at: now.toISOString(),
    latest_revision_sha256: "a".repeat(64), first_ingestion_record_id: ingestion.data.id, latest_ingestion_record_id: ingestion.data.id,
  }).select("id").single();
  assert.ifError(event.error);
  weatherEventId = event.data.id;
  const opportunity = await service.from("weather_opportunities").insert({ weather_event_id: weatherEventId, classification: "monitor", classifier_version: "security-probe-v1", rationale: ["probe"], classified_at: now.toISOString() }).select("id").single();
  assert.ifError(opportunity.error);
  weatherOpportunityId = opportunity.data.id;
  const governedGeometry = {
    type: "Polygon",
    coordinates: [[[-97.2, 32.6], [-96.4, 32.6], [-96.4, 33.2], [-97.2, 33.2], [-97.2, 32.6]]],
  };
  assert.ifError((await service.rpc("set_weather_event_governed_geometry", {
    p_event_id: weatherEventId,
    p_geometry: governedGeometry,
  })).error);
  const exposureRefresh = await service.rpc("refresh_weather_client_exposures", { p_near_radius_km: 50 });
  assert.ifError(exposureRefresh.error);
  assert.deepEqual(Object.keys(exposureRefresh.data).sort(), ["direct", "near", "outside", "unknown"]);

  assert.ifError((await service.from("application_profiles").update({ role: "staging_admin" }).eq("user_id", userId)).error);
  const adminWeather = await viewer.from("weather_internal_active_alerts").select("id").eq("id", weatherEventId);
  assert.ifError(adminWeather.error);
  assert.equal(adminWeather.data?.length, 1, "security-invoker view must expose approved rows to staging_admin");
  const adminBranches = await viewer.rpc("get_weather_internal_branch_locations");
  assert.ifError(adminBranches.error);
  assert.ok(adminBranches.data?.length >= 2, "staging_admin receives governed branch locations");
  const adminClientLocations = await viewer.rpc("get_weather_internal_client_locations_v2");
  assert.ifError(adminClientLocations.error);
  const rawRevisions = await viewer.from("weather_event_revisions").select("normalized_payload").limit(1);
  assert.ok(rawRevisions.error, "normalized revision payload remains service-role-only");

  const clients = await service.from("clients").select("id").limit(2);
  assert.ifError(clients.error);
  const branches = await service.from("branches").select("id,client_id");
  assert.ifError(branches.error);
  const firstClient = clients.data[0];
  const foreignBranch = branches.data.find((branch) => branch.client_id !== firstClient.id);
  assert.ok(firstClient && foreignBranch, "security fixture requires branches for two clients");
  const inconsistentExposure = await service.from("weather_client_exposures").insert({ weather_opportunity_id: weatherOpportunityId, client_id: firstClient.id, branch_id: foreignBranch.id, exposure_status: "unknown", methodology: "security probe", evaluated_at: now.toISOString() });
  assert.ok(inconsistentExposure.error, "PostgreSQL must reject cross-client branch ownership");
  assert.equal(inconsistentExposure.error.code, "23503", "composite ownership violation must be a foreign-key error");
  console.log("Weather database security probe passed.");
} finally {
  if (weatherOpportunityId) await service.from("weather_opportunities").delete().eq("id", weatherOpportunityId);
  if (weatherEventId) {
    await service.from("weather_events").delete().eq("id", weatherEventId);
  }
  await service.from("weather_sources").delete().eq("id", sourceId);
  if (userId) await service.auth.admin.deleteUser(userId);
}
