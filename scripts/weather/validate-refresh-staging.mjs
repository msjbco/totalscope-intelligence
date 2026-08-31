import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && key && new URL(url).hostname.startsWith("ygeahqczlrwaadvlsiew."), "Exact isolated staging environment required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function count(table, configure = (query) => query, column = "id") {
  const response = await configure(db.from(table).select(column, { count: "exact", head: true }));
  assert.ifError(response.error);
  return response.count;
}

const recentRefreshes = await db.from("weather_provider_refreshes")
  .select("status,records_returned,retry_count,latency_ms,error_classification,attempted_at,completed_at")
  .eq("weather_source_id", "nws").order("attempted_at", { ascending: false }).limit(5);
assert.ifError(recentRefreshes.error);

const result = {
  events: {
    total: await count("weather_events"),
    active: await count("weather_events", (query) => query.eq("provider_status", "Actual")),
    inactive: await count("weather_events", (query) => query.eq("provider_status", "Inactive")),
    inactiveWithGeometry: await count("weather_events", (query) => query.eq("provider_status", "Inactive").not("geometry_json", "is", null)),
  },
  revisions: await count("weather_event_revisions"),
  leases: await count("weather_refresh_leases", (query) => query, "weather_source_id"),
  exposures: {
    direct: await count("weather_client_exposures", (query) => query.eq("exposure_status", "direct")),
    near: await count("weather_client_exposures", (query) => query.eq("exposure_status", "near")),
  },
  recentRefreshes: recentRefreshes.data,
};

assert.equal(result.leases, 0, "completed refresh must release its lease");
assert.ok(result.events.inactive > 0, "historical inactive events must remain persisted");
assert.ok(result.revisions >= result.events.total, "canonical weather must retain revision provenance");
assert.equal(result.recentRefreshes[0]?.status, "succeeded", "latest refresh must have succeeded");
console.log(JSON.stringify(result));
