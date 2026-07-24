import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read=(path)=>readFileSync(path,"utf8");
const migration=read("supabase/migrations/202607230002_c2_staging_security.sql");
const filesUnder=(root)=>readdirSync(root).flatMap(name=>{const path=join(root,name);return statSync(path).isDirectory()?filesUnder(path):[path]});

test("viewer and staging admin are the only roles and profiles cannot self-elevate",()=>{
  assert.match(migration,/create type public\.application_role as enum \('viewer', 'staging_admin'\)/);
  assert.match(migration,/default 'viewer'::public\.application_role/);
  assert.doesNotMatch(migration,/application_profiles for update/);
  assert.match(migration,/revoke insert, update, delete[\s\S]*application_profiles from anon, authenticated/);
});

test("anonymous and authenticated roles cannot read raw or staging tables",()=>{
  assert.match(migration,/revoke all on all tables in schema public from anon, authenticated/);
  for(const table of ["source_files","source_worksheets","organization_aliases","people","person_aliases","staged_claim_rows"]){
    assert.doesNotMatch(migration,new RegExp(`grant select[^;]*on public\\.${table} to authenticated`));
  }
  assert.doesNotMatch(migration,/grant select \([^)]*raw_row[^)]*\)/);
});

test("admin validation is denied to viewers at both route and database layers",()=>{
  assert.match(read("app/admin/layout.tsx"),/requireRole\("staging_admin"\)/);
  assert.match(migration,/private\.is_staging_admin\(\)/);
  assert.match(migration,/staging admins read import jobs/);
});

test("admin validation query uses only authorized import job fields",()=>{
  const repository=read("lib/data/live-repository.ts");
  const validationQuery=repository.match(/"import_jobs\?[^"]+"/)?.[0]??"";
  assert.equal(
    validationQuery,
    '"import_jobs?source_period=eq.2026-Q2&select=id,status,source_filename,source_sha256,source_period,importer_version,started_at,completed_at,source_workbook_metadata&order=started_at.desc,id.desc&limit=1"',
  );
  assert.doesNotMatch(validationQuery,/select=\*/);
  assert.doesNotMatch(validationQuery,/created_at/);
  assert.match(validationQuery,/order=started_at\.desc,id\.desc/);
});

test("live repositories require an authenticated user JWT and never use service role",()=>{
  const repository=read("lib/data/supabase-rest.ts");
  assert.match(repository,/auth\.getUser\(\)/);
  assert.match(repository,/session\.access_token/);
  assert.match(repository,/apikey: anonKey/);
  assert.doesNotMatch(repository,/SERVICE_ROLE|serviceRole/);
  const clientSource=filesUnder("app").concat(filesUnder("components"),filesUnder("lib")).map(read).join("\n");
  assert.doesNotMatch(clientSource,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("live mode has no silent demo fallback and protected pages have server guards",()=>{
  assert.doesNotMatch(read("lib/data/config.ts"),/\?\? "demo"/);
  assert.match(read("lib/data/config.ts"),/must be explicitly set/);
  for(const route of ["dashboard","claims","operations","weather","carriers","contractors","reports","settings"]){
    assert.match(read(`app/${route}/layout.tsx`),/requireLiveUser\(\)/);
  }
  assert.match(read("middleware.ts"),/updateSession/);
  assert.match(read("lib/supabase/middleware.ts"),/NextResponse\.redirect/);
});

test("import requires a declared target and matching command-line confirmation",()=>{
  const importer=read("scripts/q2_2026_import.py");
  assert.match(importer,/TOTALSCOPE_IMPORT_TARGET/);
  assert.match(importer,/--confirm-target/);
  assert.match(importer,/Production-like target hostname rejected/);
  assert.match(importer,/Import confirmation mismatch/);
});

test("health response is coarse and does not expose configuration values",()=>{
  const health=read("app/api/health/route.ts");
  assert.match(health,/database:healthy\?"ok":"unavailable"/);
  assert.doesNotMatch(health,/serviceRole|SUPABASE_SERVICE_ROLE_KEY|source_filename|claim_count/);
});
