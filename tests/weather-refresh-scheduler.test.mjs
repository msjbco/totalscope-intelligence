import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyMissingEvent, isTransientNwsStatus, NWS_REFRESH_INTERVAL_MINUTES, retryDelayMs } from "../scripts/weather/refresh-policy.mjs";

const migration = readFileSync("supabase/migrations/202608300001_weather_refresh_scheduler.sql", "utf8");
const workflow = readFileSync(".github/workflows/weather-refresh-staging.yml", "utf8");
const runner = readFileSync("scripts/weather/refresh-nws-staging.mjs", "utf8");

test("NWS schedule is governed at exactly thirty minutes", () => {
  assert.equal(NWS_REFRESH_INTERVAL_MINUTES, 30);
  assert.match(workflow, /cron: "\*\/30 \* \* \* \*"/);
  assert.doesNotMatch(workflow, /\*\/5 /);
});

test("database lease is service-only and bounded", () => {
  assert.match(migration, /create table public\.weather_refresh_leases/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /expires_at <= now\(\)/);
  assert.match(migration, /revoke all on public\.weather_refresh_leases from public, anon, authenticated/);
});

test("retry policy is bounded and transient-only", () => {
  assert.equal(isTransientNwsStatus(429), true);
  assert.equal(isTransientNwsStatus(503), true);
  assert.equal(isTransientNwsStatus(404), false);
  assert.deepEqual([0, 1, 2].map((n) => retryDelayMs(n)), [1000, 2000, 4000]);
  assert.equal(retryDelayMs(0, "60"), 10_000);
});

test("missing alerts are closed or expired without deletion", () => {
  assert.equal(classifyMissingEvent({ expires_at: "2026-08-30T10:00:00Z" }, "2026-08-30T11:00:00Z"), "expired");
  assert.equal(classifyMissingEvent({ expires_at: "2026-08-30T12:00:00Z" }, "2026-08-30T11:00:00Z"), "closed");
  assert.doesNotMatch(runner, /from\("weather_events"\)\.delete/);
  assert.match(runner, /provider_status:\s*"Inactive"/);
});

test("canonical identity lookup paginates beyond the Supabase row limit", () => {
  assert.match(runner, /async function loadExistingEvents/);
  assert.match(runner, /\.range\(offset, offset \+ pageSize - 1\)/);
  assert.match(runner, /\.order\("provider_event_id"/);
});

test("duplicate provider records preserve raw rows while reconciling one canonical identity", () => {
  assert.match(runner, /duplicateProviderRecords/);
  assert.match(runner, /byProvider\.set\(event\.providerEventId/);
  assert.match(runner, /sourceLocator = `features\/\$\{index\}/);
});

test("scheduler has manual recovery and server-only secrets", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /STAGING_SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow, /NEXT_PUBLIC_.*SERVICE/);
});
