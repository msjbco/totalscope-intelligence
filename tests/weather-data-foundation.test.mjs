import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeNwsFeatureCollection } from "../scripts/weather/normalize-nws-alerts.mjs";

const fixture = JSON.parse(readFileSync("tests/fixtures/weather/nws-active-alerts.json", "utf8"));
const migration = readFileSync("supabase/migrations/202607290001_weather_data_foundation.sql", "utf8");
const contract = JSON.parse(readFileSync("config/source-contracts/nws-alerts-v1.json", "utf8"));
const repository = readFileSync("lib/weather/live-weather-repository.ts", "utf8");
const provider = readFileSync("lib/weather/providers/nws-weather-provider.ts", "utf8");
const map = readFileSync("components/dashboard/weather-intelligence-map.tsx", "utf8");
const zctaMigration = readFileSync("supabase/migrations/202608110001_weather_zcta_geography.sql", "utf8");
const zctaOptimizationMigration = readFileSync("supabase/migrations/202608120003_weather_zcta_multipolygon_candidate_optimization.sql", "utf8");
const zctaImporter = readFileSync("scripts/weather/import-census-zctas.mjs", "utf8");

test("NWS source contract is incremental, stable, and geometry-aware", () => {
  assert.equal(contract.sourceSystem, "nws_api");
  assert.deepEqual(contract.modeSupport, ["full", "incremental"]);
  assert.deepEqual(contract.tables[0].stableKey, ["id"]);
  assert.equal(contract.tables[0].fields.some((field) => field.name === "geometry" && field.type === "geojson"), true);
});

test("NWS fixtures normalize deterministically with lifecycle and provenance timestamps", () => {
  const first = normalizeNwsFeatureCollection(fixture, fixture.updated);
  const second = normalizeNwsFeatureCollection(fixture, fixture.updated);
  const laterRetrieval = normalizeNwsFeatureCollection(fixture, "2026-07-29T14:05:00.000Z");
  assert.deepEqual(first, second);
  assert.equal(first.length, 2);
  assert.deepEqual(first.map((alert) => alert.lifecycleStatus), ["warning", "watch"]);
  assert.equal(first.every((alert) => /^[a-f0-9]{64}$/.test(alert.revisionSha256)), true);
  assert.equal(first.every((alert) => alert.geometry?.type === "Polygon"), true);
  assert.equal(first.every((alert) => alert.sourceObservedAt === "2026-07-29T14:00:00.000Z"), true);
  assert.deepEqual(first.map((alert) => alert.revisionSha256), laterRetrieval.map((alert) => alert.revisionSha256));
  assert.notDeepEqual(first.map((alert) => alert.sourceObservedAt), laterRetrieval.map((alert) => alert.sourceObservedAt));
});

test("weather schema is additive, immutable, RLS-protected, and browser read-only", () => {
  assert.match(migration, /create table public\.weather_sources/);
  assert.match(migration, /create table public\.weather_events/);
  assert.match(migration, /create table public\.weather_event_revisions/);
  assert.match(migration, /references public\.ingestion_records/);
  assert.match(migration, /weather_event_revisions_immutable/);
  assert.equal((migration.match(/enable row level security/g) ?? []).length, 10);
  assert.match(migration, /with \(security_invoker = true\)/);
  assert.match(migration, /private\.is_staging_admin\(\)/);
  assert.match(migration, /foreign key \(branch_id, client_id\) references public\.branches\(id, client_id\)/);
  assert.match(migration, /revoke insert, update, delete, truncate, references, trigger/);
  assert.doesNotMatch(migration, /\bdrop\s+(table|view|function|type)\b/i);
});

test("browser weather repository uses authenticated anon-session REST only", () => {
  assert.match(repository, /supabaseRest/);
  assert.match(repository, /weather_internal_active_alerts/);
  assert.doesNotMatch(repository, /service[_-]?role|SUPABASE_SERVICE_ROLE_KEY/i);
});

test("NWS forecast timestamp accepts current generatedAt payloads without weakening validation", () => {
  assert.match(provider, /properties\.updated[\s\S]*properties\.generatedAt/);
  assert.match(provider, /properties\.generatedAt", true/);
});

test("weather geography renders as inspectable SVG rather than a WebGL-only canvas", () => {
  assert.match(map, /<svg className="weather-map weather-svg-map"/);
  assert.match(map, /geometrySvgPath/);
  assert.doesNotMatch(map, /new module\.Map|maplibregl-canvas/);
});

test("weather semantics do not equate alerts with confirmed damage", () => {
  assert.match(migration, /Alerts do not assert property damage/);
  assert.match(migration, /confirmed_history/);
  assert.match(migration, /radar_observed/);
  assert.match(migration, /preliminary_report/);
});

test("governed ZCTA schema is versioned, spatially indexed, and browser-inaccessible", () => {
  assert.match(zctaMigration, /create table public\.zcta_dataset_versions/);
  assert.match(zctaMigration, /create table public\.zcta_geographies/);
  assert.match(zctaMigration, /geometry extensions\.geometry\(MultiPolygon, 4326\)/);
  assert.match(zctaMigration, /using gist\(geometry\)/);
  assert.equal((zctaMigration.match(/enable row level security/g) ?? []).length, 2);
  assert.match(zctaMigration, /revoke all on public\.zcta_dataset_versions, public\.zcta_geographies from public, anon, authenticated/);
  assert.doesNotMatch(zctaMigration, /grant select[^;]+authenticated/);
});

test("ZCTA import is count-gated, fingerprinted, version-aware, and retry-safe", () => {
  assert.match(zctaMigration, /source_sha256/);
  assert.match(zctaMigration, /on conflict \(dataset_version, zcta5\) do update/);
  assert.match(zctaMigration, /v_count <> p_expected_record_count/);
  assert.match(zctaMigration, /status = 'active'/);
  assert.match(zctaImporter, /tl_2025_us_zcta520\.zip/);
  assert.match(zctaImporter, /createHash\("sha256"\)/);
});

test("database intersection excludes boundary-only touches with a material-area threshold", () => {
  assert.match(zctaMigration, /ST_Intersects/);
  assert.match(zctaMigration, /OPERATOR\(extensions\.&&\)/);
  assert.match(zctaMigration, /ST_Area\(extensions\.ST_Intersection/);
  assert.match(zctaMigration, /greatest\([\s\S]*p_minimum_area_square_meters[\s\S]*p_minimum_zcta_fraction/);
  assert.match(zctaMigration, /array_agg\(z\.zcta5 order by z\.zcta5\)/);
});

test("administrator-only ZCTA RPC returns identifiers without nationwide geometry", () => {
  assert.match(zctaMigration, /if not private\.is_staging_admin\(\)/);
  assert.match(zctaMigration, /returns table \(source_id text, available boolean, zctas text\[\]/);
  assert.doesNotMatch(zctaMigration, /returns table[^;]+geometry/i);
});

test("MultiPolygon candidate optimization preserves full-geometry material matching", () => {
  assert.match(zctaOptimizationMigration, /extensions\.ST_Dump\(a\.alert_geometry\)/);
  assert.match(zctaOptimizationMigration, /select distinct p\.alert_ordinality,z\.zcta5/);
  assert.match(zctaOptimizationMigration, /OPERATOR\(extensions\.&&\) p\.discovery_geometry/);
  assert.match(zctaOptimizationMigration, /ST_Intersects\(z\.geometry,p\.discovery_geometry\)/);
  assert.match(zctaOptimizationMigration, /ST_Intersection\(c\.geometry,c\.alert_geometry\)/);
  assert.doesNotMatch(zctaOptimizationMigration, /ST_Intersection\(c\.geometry,p\.discovery_geometry\)/);
});
