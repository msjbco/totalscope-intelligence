import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import shapefile from "shapefile";
import { evaluateZctaImportState } from "./zcta-import-idempotency.mjs";

const VERSION = "2025-tiger-line-zcta520";
const SOURCE_NAME = "U.S. Census Bureau 2025 TIGER/Line ZCTA5";
const SOURCE_URL = "https://www2.census.gov/geo/tiger/TIGER2025/ZCTA520/tl_2025_us_zcta520.zip";
const SOURCE_CRS = "NAD83 / EPSG:4269";
const workspace = resolve("data/source/census-zcta");
const archive = resolve(workspace, "tl_2025_us_zcta520.zip");
const shapePath = resolve(workspace, "tl_2025_us_zcta520.shp");
const dbfPath = resolve(workspace, "tl_2025_us_zcta520.dbf");
const mode = process.argv[2] ?? "all";

mkdirSync(workspace, { recursive: true });

async function download() {
  if (existsSync(archive)) return;
  const response = await fetch(SOURCE_URL);
  if (!response.ok || !response.body) throw new Error(`Census download failed (${response.status}).`);
  await pipeline(response.body, createWriteStream(archive));
}

function prepare() {
  if (existsSync(shapePath) && existsSync(dbfPath)) return;
  const result = spawnSync("tar.exe", ["-xf", archive, "-C", workspace], { stdio: "inherit" });
  if (result.status !== 0) throw new Error("Census archive extraction failed.");
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function readFeatures(visitor) {
  const source = await shapefile.open(shapePath, dbfPath);
  let count = 0;
  while (true) {
    const record = await source.read();
    if (record.done) break;
    const feature = record.value;
    const properties = feature.properties ?? {};
    const normalized = {
      zcta5: properties.ZCTA5CE20 ?? properties.GEOID20,
      geometry: feature.geometry,
      land_area_square_meters: properties.ALAND20 ?? null,
      water_area_square_meters: properties.AWATER20 ?? null,
    };
    if (!/^\d{5}$/.test(normalized.zcta5) || !normalized.geometry) throw new Error(`Invalid Census feature at record ${count + 1}.`);
    count += 1;
    if (visitor) await visitor(normalized, count);
  }
  return count;
}

async function rpc(payload, key) {
  const url = process.env.SUPABASE_URL;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  const response = await fetch(`${url}/rest/v1/rpc/import_zcta_geography_batch`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`ZCTA import RPC failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function getExistingImportState(key, fingerprint, expectedRecordCount) {
  const url = process.env.SUPABASE_URL;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const versionsResponse = await fetch(`${url}/rest/v1/zcta_dataset_versions?select=version,status,source_sha256,expected_record_count,imported_record_count&status=eq.active`, { headers });
  if (!versionsResponse.ok) throw new Error(`ZCTA version verification failed (${versionsResponse.status}): ${await versionsResponse.text()}`);
  const activeVersions = await versionsResponse.json();
  let geometryCount = null;
  const matching = activeVersions.length === 1 && activeVersions[0].version === VERSION;
  if (matching) {
    const countResponse = await fetch(`${url}/rest/v1/zcta_geographies?select=zcta5&dataset_version=eq.${encodeURIComponent(VERSION)}`, {
      method: "HEAD",
      headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
    });
    if (!countResponse.ok) throw new Error(`ZCTA geometry-count verification failed (${countResponse.status}): ${await countResponse.text()}`);
    const match = countResponse.headers.get("content-range")?.match(/\/(\d+)$/);
    if (!match) throw new Error("ZCTA geometry-count verification returned no exact count.");
    geometryCount = Number(match[1]);
  }
  return evaluateZctaImportState({
    activeVersions,
    geometryCount,
    requested: { version: VERSION, sourceSha256: fingerprint, expectedRecordCount },
  });
}

async function importDataset() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fingerprint = await sha256(archive);
  const expected = await readFeatures();
  const existing = await getExistingImportState(key, fingerprint, expected);
  if (existing.shortCircuit) {
    console.log(JSON.stringify({ version: VERSION, expected, imported: expected, idempotentKey: `${VERSION}:${fingerprint}`, shortCircuited: true, geometryWrites: 0 }));
    return;
  }
  let batch = [];
  let imported = 0;
  const send = async (finalize = false) => {
    const result = await rpc({ p_version: VERSION, p_source_name: SOURCE_NAME, p_source_url: SOURCE_URL, p_source_sha256: fingerprint, p_source_crs: SOURCE_CRS, p_expected_record_count: expected, p_features: batch, p_finalize: finalize }, key);
    imported = result.record_count;
    batch = [];
  };
  await readFeatures(async (feature) => {
    batch.push(feature);
    if (batch.length >= 40) await send(false);
  });
  if (batch.length) await send(false);
  await send(true);
  console.log(JSON.stringify({ version: VERSION, expected, imported, idempotentKey: `${VERSION}:${fingerprint}` }));
}

if (["download", "prepare", "all"].includes(mode)) await download();
if (["prepare", "all"].includes(mode)) prepare();
if (["import", "all"].includes(mode)) await importDataset();
