import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const EXPECTED = "ygeahqczlrwaadvlsiew";
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey || new URL(url).hostname.split(".")[0] !== EXPECTED || !process.argv.includes("--confirm-staging")) {
  throw new Error("Hosted Weather probe requires exact isolated staging confirmation");
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, options);
const anonymous = createClient(url, anonKey, options);
const viewer = createClient(url, anonKey, options);
const email = `weather-hosted-security-${Date.now()}@example.invalid`;
const password = `Weather-hosted-${randomUUID()}!`;
let userId;

try {
  assert.ok((await anonymous.from("weather_internal_active_alerts").select("id").limit(1)).error);
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  assert.ifError((await viewer.auth.signInWithPassword({ email, password })).error);
  const viewerWeather = await viewer.from("weather_events").select("id").limit(1);
  assert.ifError(viewerWeather.error);
  assert.equal(viewerWeather.data.length, 0);
  assert.ok((await viewer.rpc("get_weather_internal_branch_locations")).error);
  assert.ok((await viewer.rpc("get_weather_internal_client_locations_v2")).error);
  assert.ok((await viewer.rpc("refresh_weather_client_exposures", { p_near_radius_km: 50 })).error);
  assert.ok((await viewer.from("weather_events").update({ event_name: "forbidden" }).eq("id", randomUUID())).error);

  const refreshed = await service.rpc("refresh_weather_client_exposures", { p_near_radius_km: 50 });
  assert.ifError(refreshed.error);
  assert.deepEqual(Object.keys(refreshed.data).sort(), ["direct", "near", "outside", "unknown"]);

  assert.ifError((await service.from("application_profiles").update({ role: "staging_admin" }).eq("user_id", userId)).error);
  const adminWeather = await viewer.from("weather_internal_active_alerts").select("id").limit(1);
  assert.ifError(adminWeather.error);
  assert.ok(adminWeather.data.length > 0);
  const adminBranches = await viewer.rpc("get_weather_internal_branch_locations");
  assert.ifError(adminBranches.error);
  assert.ok(adminBranches.data.length > 0);
  const adminClients = await viewer.rpc("get_weather_internal_client_locations_v2");
  assert.ifError(adminClients.error);
  assert.ok(adminClients.data.length > 0);
  assert.ok((await viewer.from("weather_event_revisions").select("normalized_payload").limit(1)).error);

  const opportunity = await service.from("weather_opportunities").select("id").limit(1).single();
  const clients = await service.from("clients").select("id").limit(2);
  const branches = await service.from("branches").select("id,client_id").limit(100);
  assert.ifError(opportunity.error);
  assert.ifError(clients.error);
  assert.ifError(branches.error);
  const client = clients.data[0];
  const foreignBranch = branches.data.find((row) => row.client_id !== client.id);
  assert.ok(client && foreignBranch);
  const inconsistent = await service.from("weather_client_exposures").insert({ weather_opportunity_id: opportunity.data.id, client_id: client.id, branch_id: foreignBranch.id, exposure_status: "unknown", methodology: "ownership probe", evaluated_at: new Date().toISOString() });
  assert.equal(inconsistent.error?.code, "23503");

  console.log(JSON.stringify({ passed: true, viewerDenied: true, adminApprovedInterfaces: true, serviceRefresh: refreshed.data, ownershipEnforced: true, fixtureRowsCreated: 0 }));
} finally {
  await viewer.auth.signOut();
  if (userId) await service.auth.admin.deleteUser(userId);
  const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.ifError(listed.error);
  assert.equal(listed.data.users.filter((user) => user.email?.startsWith("weather-hosted-security-")).length, 0);
}
