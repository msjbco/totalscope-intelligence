import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { buildImportPlan, canonicalBranchNormalizedName, normalizeCompanyRow, parseCompanyExport } from "../scripts/client-data/company-export-core.mjs";

const header = "entity_id,entity,email,mobilephone,activestatus,address_id,streetnumber,streetname,city,state,zip,user_id,namefirst,namelast,role_id,datetimecreated";
const row = (overrides = {}) => ({ entity_id:"e1",entity:"Example Restoration",email:"OPS@EXAMPLE.COM",mobilephone:"(214) 555-0100",activestatus:"A",address_id:"a1",streetnumber:"100",streetname:"Main St",city:"Dallas",state:"tx",zip:"75201",user_id:"u1",namefirst:"Sam",namelast:"Lee",role_id:"ADMIN",datetimecreated:"2026-01-01T00:00:00Z",...overrides });
const csv = (rows) => `${header}\n${rows.map((item) => Object.values(item).join(",")).join("\n")}\n`;

test("source contract parses deterministically and normalizes governed fields", () => {
  const parsed = parseCompanyExport(csv([row()]));
  const normalized = normalizeCompanyRow(parsed[0], 2, { A:"current" });
  assert.equal(normalized.normalized.stableClientId, "totalscope-company:e1");
  assert.equal(normalized.normalized.stableBranchId, "totalscope-company:e1:address:a1");
  assert.equal(normalized.normalized.companyEmail, "ops@example.com");
  assert.equal(normalized.normalized.companyPhone, "2145550100");
  assert.equal(normalized.normalized.active, true);
});

test("duplicate entity rows create one client while preserving contacts and locations", () => {
  const plan = buildImportPlan([row(), row({ address_id:"a2",streetnumber:"200",user_id:"u2",namefirst:"Alex" })], { A:"current" });
  assert.equal(plan.summary.clients, 1);
  assert.equal(plan.summary.locations, 2);
  assert.equal(plan.summary.people, 2);
  assert.equal(plan.summary.clientContacts, 2);
});

test("address identity is composite and reused address IDs do not merge companies", () => {
  const plan = buildImportPlan([row(), row({ entity_id:"e2",entity:"Other Co" })], { A:"current" });
  assert.equal(plan.summary.clients, 2);
  assert.equal(plan.summary.locations, 2);
  assert.notEqual(plan.rows[0].normalized.stableBranchId, plan.rows[1].normalized.stableBranchId);
});

test("same-label source addresses receive deterministic disambiguated branch names", () => {
  const branch={streetAddress:"100 Main Street",city:"Dallas",addressId:"address-002"};
  assert.equal(canonicalBranchNormalizedName(branch),"100 main street");
  assert.equal(canonicalBranchNormalizedName(branch,true),"100 main street source address address 002");
});

test("idempotent importer reporting distinguishes reuse from original writes", () => {
  const importer=readFileSync("scripts/client-data/import-company-export.mjs","utf8");
  assert.match(importer,/idempotent:true[\s\S]*created:0,updated:0,unchanged:plan\.summary\.clients/);
  assert.match(importer,/created:0,updated:0,unchanged:plan\.summary\.locations/);
  assert.match(importer,/created:0,updated:0,unchanged:plan\.summary\.people/);
});

test("multiple contacts at one company address do not create duplicate locations", () => {
  const plan = buildImportPlan([row(), row({ user_id:"u2",namefirst:"Alex" })], { A:"current" });
  assert.equal(plan.summary.clients, 1);
  assert.equal(plan.summary.locations, 1);
  assert.equal(plan.summary.clientContacts, 2);
});

test("missing address, malformed ZIP, and ambiguous status remain visible", () => {
  const normalized = normalizeCompanyRow(row({ address_id:"",zip:"BAD",activestatus:"?" }), 2, {});
  assert.equal(normalized.accepted, true);
  assert.equal(normalized.normalized.stableBranchId, null);
  assert.equal(normalized.normalized.postalCode, null);
  assert.equal(normalized.normalized.lifecycleStatus, "unknown");
  assert.deepEqual(normalized.issues.map((issue) => issue.code).sort(), ["malformed_zip","missing_address_id","unknown_status_code"]);
});

test("inactive mapping is explicit and never inferred", () => {
  const active = normalizeCompanyRow(row({ activestatus:"A" }), 2);
  const inactive = normalizeCompanyRow(row({ activestatus:"I" }), 2);
  const deleted = normalizeCompanyRow(row({ activestatus:"D" }), 2);
  assert.equal(active.normalized.lifecycleStatus, "current");
  assert.equal(active.normalized.active, true);
  assert.equal(inactive.normalized.lifecycleStatus, "inactive");
  assert.equal(inactive.normalized.sourceStatusCode, "I");
  assert.equal(deleted.normalized.lifecycleStatus, "inactive");
  assert.equal(deleted.normalized.sourceStatusCode, "D");
  assert.equal(inactive.normalized.active, false);
  assert.equal(deleted.normalized.active, false);
});

test("missing company identity is quarantined without silent row loss", () => {
  const plan = buildImportPlan([row({ entity:"" }), row()], { A:"current" });
  assert.equal(plan.summary.sourceRows, 2);
  assert.equal(plan.summary.acceptedRows, 1);
  assert.equal(plan.summary.quarantinedRows, 1);
});

test("client master migration enforces ownership and internal-only access", () => {
  const migration = readFileSync("supabase/migrations/202608210001_client_master_foundation.sql", "utf8");
  assert.match(migration, /foreign key \(branch_id, client_id\) references public\.branches\(id, client_id\)/);
  assert.match(migration, /unique \(source_system, external_client_id, external_address_id\)/);
  assert.match(migration, /revoke all on public\.client_location_source_identities,public\.client_contact_relationships from public,anon,authenticated/);
  assert.match(migration, /get_weather_internal_client_locations_v2/);
  assert.match(migration, /c\.lifecycle_status = 'current'/);
});

test("future prospect contracts preserve current, inactive, deleted, and unknown relationship states", () => {
  const contracts = readFileSync("lib/weather/contracts.ts", "utf8");
  assert.match(contracts, /"current_client"[\s\S]*"inactive_client"[\s\S]*"deleted_former_client"[\s\S]*"no_known_client_relationship"/);
});

test("live client routes are internal, canonical, and do not use demo fallback", () => {
  const layout = readFileSync("app/operations/clients/layout.tsx", "utf8");
  const directory = readFileSync("app/operations/clients/page.tsx", "utf8");
  const profile = readFileSync("app/operations/clients/[clientId]/page.tsx", "utf8");
  const weather = readFileSync("components/dashboard/live-weather-dashboard.tsx", "utf8");
  const repository = readFileSync("lib/operations/live-client-repository.ts", "utf8");
  assert.match(layout, /requireRole\("staging_admin"\)/);
  assert.match(weather, /import Link from "next\/link"/);
  assert.match(weather, /operations\/clients\/\$\{exposure\.clientId\}/);
  assert.doesNotMatch(weather, /totalscope\.com|View TS profile|legacy/i);
  assert.match(repository, /supabaseRest/);
  assert.doesNotMatch(repository, /service.role|demo-repository/i);
  assert.match(profile, /liveClient\(clientId\)/);
  assert.match(profile, /if \(!client\) notFound\(\)/);
  assert.match(directory, /mode="live" showFilters=\{false\}/);
  assert.match(profile, /mode="live" showFilters=\{false\}/);
});

test("exposure requires defensible location precision", async () => {
  const geoSource = readFileSync("lib/weather/geo.ts", "utf8");
  const geoOutput = ts.transpileModule(geoSource, { compilerOptions:{ module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022 } }).outputText;
  const geoUrl = `data:text/javascript;base64,${Buffer.from(geoOutput).toString("base64")}`;
  const source = readFileSync("lib/weather/exposure.ts", "utf8").replace('"@/lib/weather/geo"', `"${geoUrl}"`);
  const output = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022 } }).outputText;
  const { evaluateClientExposure } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
  const opportunity = { id:"w1", alert:{ geometry:{ type:"Polygon",coordinates:[[[-97,32],[-96,32],[-96,33],[-97,33],[-97,32]]] } } };
  const base = { clientId:"c",branchId:"b",clientName:"Client",branchName:"Dallas",latitude:32.5,longitude:-96.5,city:"Dallas",state:"TX",postalCode:"75201" };
  assert.equal(evaluateClientExposure(opportunity, { ...base, locationPrecision:"rooftop" }).status, "direct");
  assert.equal(evaluateClientExposure(opportunity, { ...base, locationPrecision:"zip" }).status, "unknown");
});
