import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, "Supabase database-test environment is required");

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const anonymous = createClient(url, anonKey, options);
const service = createClient(url, serviceKey, options);
const tokenOne = randomUUID();
const tokenTwo = randomUUID();

const anonymousTable = await anonymous.from("weather_refresh_leases").select("weather_source_id").limit(1);
assert.ok(anonymousTable.error, "anonymous browser role must not read refresh leases");
const anonymousAcquire = await anonymous.rpc("acquire_weather_refresh_lease", {
  p_weather_source_id: "nws", p_lease_token: tokenOne, p_holder: "unauthorized", p_lease_seconds: 60,
});
assert.ok(anonymousAcquire.error, "anonymous browser role must not acquire refresh leases");

const first = await service.rpc("acquire_weather_refresh_lease", {
  p_weather_source_id: "nws", p_lease_token: tokenOne, p_holder: "database-security-probe", p_lease_seconds: 60,
});
assert.ifError(first.error);
assert.equal(first.data, true);
const overlapping = await service.rpc("acquire_weather_refresh_lease", {
  p_weather_source_id: "nws", p_lease_token: tokenTwo, p_holder: "overlap-probe", p_lease_seconds: 60,
});
assert.ifError(overlapping.error);
assert.equal(overlapping.data, false, "overlapping distributed refresh must be denied");
const wrongRelease = await service.rpc("release_weather_refresh_lease", { p_weather_source_id: "nws", p_lease_token: tokenTwo });
assert.ifError(wrongRelease.error);
assert.equal(wrongRelease.data, false);
const release = await service.rpc("release_weather_refresh_lease", { p_weather_source_id: "nws", p_lease_token: tokenOne });
assert.ifError(release.error);
assert.equal(release.data, true);

console.log(JSON.stringify({ status: "pass", anonymousDenied: true, overlapDenied: true, tokenScopedRelease: true }));
