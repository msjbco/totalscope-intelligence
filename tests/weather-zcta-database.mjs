import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("ZCTA database probe requires local Supabase URL, service-role key, and anon key.");

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, options);
const viewer = createClient(url, anonKey, options);
const admin = createClient(url, anonKey, options);
const suffix = Date.now();
const password = `Zcta-local-${crypto.randomUUID()}!`;
let viewerId;
let adminId;

const polygon = (west, south, east, north) => ({ type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] });

try {
  const version = await service.from("zcta_dataset_versions").select("version,status,expected_record_count,imported_record_count,source_sha256,source_crs,storage_crs").eq("status", "active").single();
  assert.ifError(version.error);
  assert.equal(version.data.version, "2025-tiger-line-zcta520");
  assert.equal(version.data.expected_record_count, 33791);
  assert.equal(version.data.imported_record_count, 33791);
  const count = await service.from("zcta_geographies").select("zcta5", { count: "exact", head: true }).eq("dataset_version", version.data.version);
  assert.ifError(count.error);
  assert.equal(count.count, 33791);

  for (const role of ["viewer", "admin"]) {
    const created = await service.auth.admin.createUser({ email: `weather-zcta-${role}-${suffix}@example.invalid`, password, email_confirm: true });
    assert.ifError(created.error);
    if (role === "viewer") viewerId = created.data.user.id;
    else adminId = created.data.user.id;
  }
  assert.ifError((await service.from("application_profiles").update({ role: "staging_admin" }).eq("user_id", adminId)).error);
  assert.ifError((await viewer.auth.signInWithPassword({ email: `weather-zcta-viewer-${suffix}@example.invalid`, password })).error);
  assert.ifError((await admin.auth.signInWithPassword({ email: `weather-zcta-admin-${suffix}@example.invalid`, password })).error);

  const deniedTable = await viewer.from("zcta_geographies").select("zcta5").limit(1);
  assert.ok(deniedTable.error, "ordinary browser roles cannot read national ZCTA geometry");
  const deniedRpc = await viewer.rpc("get_weather_affected_zctas", { p_alerts: [{ source_id: "viewer", geometry: polygon(-81, 35, -80.5, 35.5) }] });
  assert.ok(deniedRpc.error, "ordinary viewers cannot intersect internal Weather opportunities");
  const deniedMutation = await admin.from("zcta_geographies").delete().eq("zcta5", "00000");
  assert.ok(deniedMutation.error, "browser roles cannot mutate ZCTA reference geography");

  const polygonInput = { source_id: "polygon", geometry: polygon(-80.95, 35.15, -80.65, 35.35) };
  const multiInput = { source_id: "multi", geometry: { type: "MultiPolygon", coordinates: [polygon(-80.95, 35.15, -80.65, 35.35).coordinates, polygon(-86.25, 39.65, -85.95, 39.9).coordinates] } };
  const polygonStart = performance.now();
  const polygonResult = await admin.rpc("get_weather_affected_zctas", { p_alerts: [polygonInput] });
  const polygonElapsedMs = performance.now() - polygonStart;
  assert.ifError(polygonResult.error);
  const multiStart = performance.now();
  const multiResult = await admin.rpc("get_weather_affected_zctas", { p_alerts: [multiInput] });
  const multiElapsedMs = performance.now() - multiStart;
  assert.ifError(multiResult.error);

  const start = performance.now();
  const result = await admin.rpc("get_weather_affected_zctas", { p_alerts: [
    polygonInput,
    multiInput,
    { source_id: "one-component-multi", geometry: { type: "MultiPolygon", coordinates: [polygon(-80.95, 35.15, -80.65, 35.35).coordinates] } },
    { source_id: "overlapping-multi", geometry: { type: "MultiPolygon", coordinates: [polygon(-80.95, 35.15, -80.65, 35.35).coordinates, polygon(-80.85, 35.2, -80.55, 35.4).coordinates] } },
    { source_id: "broad-spacing", geometry: { type: "MultiPolygon", coordinates: [polygon(-122.5, 47.4, -122.2, 47.7).coordinates, polygon(-71.2, 42.2, -70.9, 42.5).coordinates] } },
    { source_id: "missing", geometry: null },
    { source_id: "zero-area", geometry: { type: "Polygon", coordinates: [[[-80.8, 35.2], [-80.7, 35.2], [-80.6, 35.2], [-80.8, 35.2]]] } },
  ] });
  const elapsedMs = performance.now() - start;
  assert.ifError(result.error);
  const byId = new Map(result.data.map((row) => [row.source_id, row]));
  assert.equal(byId.get("polygon").zctas.length, 31);
  assert.equal(polygonResult.data[0].zctas.length, 31);
  assert.deepEqual(byId.get("polygon").zctas, [...byId.get("polygon").zctas].sort());
  assert.equal(byId.get("multi").zctas.length, 68);
  assert.equal(multiResult.data[0].zctas.length, 68);
  assert.deepEqual(byId.get("one-component-multi").zctas, byId.get("polygon").zctas);
  assert.equal(new Set(byId.get("overlapping-multi").zctas).size, byId.get("overlapping-multi").zctas.length, "overlapping component candidates are deduplicated");
  assert.ok(byId.get("broad-spacing").zctas.length > 0, "widely separated components remain supported");
  assert.equal(byId.get("missing").available, false);
  assert.deepEqual(byId.get("zero-area").zctas, [], "zero-area/boundary-only geometry is not material exposure");
  assert.ok(elapsedMs < 5000, `indexed four-geometry intersection should remain bounded; observed ${elapsedMs.toFixed(0)} ms`);
  console.log(JSON.stringify({ status: "pass", zctaCount: count.count, polygonMatches: byId.get("polygon").zctas.length, polygonElapsedMs: Math.round(polygonElapsedMs), multiPolygonMatches: byId.get("multi").zctas.length, multiPolygonElapsedMs: Math.round(multiElapsedMs), edgeCaseBatchElapsedMs: Math.round(elapsedMs) }));
} finally {
  if (viewerId) await service.auth.admin.deleteUser(viewerId);
  if (adminId) await service.auth.admin.deleteUser(adminId);
}
