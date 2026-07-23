import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const bundledPython="C:\\Users\\msjbc\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
function inspect(){return JSON.parse(execFileSync(bundledPython,["scripts/q2_2026_import.py","inspect"],{encoding:"utf8"}));}

test("Q2 parser preserves the audited archive structure and fingerprint",()=>{
  const first=inspect();const second=inspect();
  assert.deepEqual(first,second);
  assert.equal(first.source_sha256,"8c25be883993f821e6deff6a6aa787d30ee9d794b5cf7fe73a41b58c67f06323");
  assert.equal(first.workbook_unchanged,true);
  assert.deepEqual(first.database_batch_plan,{batch_count:81,batch_sizes:{claims:25,source_rows:250,subitem_details:100,subitem_headers:100,updates:250},finalizer:"count-gated"});
  assert.deepEqual(first.validation,{failures:[],status:"pass"});
  assert.deepEqual(first.counts,{blank_update_bodies:12,claims:214,closed:37,complete:177,duplicate_body_surplus:398,exact_matches:213,mismatches:0,missing_components:1,subitem_details:1359,subitem_headers:148,tolerance_matches:0,unique_post_ids:5957,unmatched_update_item_ids:56,unmatched_update_rows:58,updates:5957});
});

test("duplicate headers are positionally disambiguated",()=>{
  const source=readFileSync("scripts/q2_2026_import.py","utf8");
  assert.match(source,/f"\{raw\}__column_\{position\}"/);
  const migration=readFileSync("supabase/migrations/202607230001_c1_q2_2026_foundation.sql","utf8");
  assert.match(migration,/duplicate-header:archive:ch-update/);
  assert.match(migration,/duplicate-header:updates:content-type/);
});

test("blank values remain distinct from numeric zero",()=>{
  const source=readFileSync("scripts/q2_2026_import.py","utf8");
  assert.match(source,/if value is None/);
  assert.match(source,/availability.*captured.*not_captured/);
});

test("data modes never silently mix or fall back",()=>{
  const repository=readFileSync("lib/data/repository.ts","utf8");
  const dashboard=readFileSync("app/dashboard/page.tsx","utf8");
  assert.match(repository,/getDataMode\(\) !== "live"/);
  assert.doesNotMatch(dashboard,/catch[\s\S]*ExecutiveDashboard/);
  assert.match(dashboard,/LiveDataError/);
});

test("database import uses bounded retry-safe batches and count-gated finalization",()=>{
  const importer=readFileSync("scripts/q2_2026_import.py","utf8");
  const migration=readFileSync("supabase/migrations/202607230001_c1_q2_2026_foundation.sql","utf8");
  assert.match(importer,/DATABASE_BATCH_SIZES/);
  assert.match(importer,/mark_q2_2026_import_failed/);
  assert.match(migration,/Import RPC batch exceeds its bounded row limit/);
  assert.match(migration,/Import finalization rejected incomplete counts/);
  assert.match(migration,/on conflict \(source_system,monday_post_id\) do nothing/);
});

test("source-row hashing calls the qualified pgcrypto bytea signature",()=>{
  const migration=readFileSync("supabase/migrations/202607230001_c1_q2_2026_foundation.sql","utf8");
  assert.match(migration,/create extension if not exists pgcrypto with schema extensions/);
  assert.match(migration,/to_regprocedure\('extensions\.digest\(bytea,text\)'\)/);
  assert.match(migration,/extensions\.digest\(\s*convert_to\(\(v_row->'raw'\)::text, 'UTF8'\),\s*'sha256'::text/s);
  assert.match(migration,/ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/);
});

test("import job retry, finalize, and failure paths assign the enum type",()=>{
  const migration=readFileSync("supabase/migrations/202607230001_c1_q2_2026_foundation.sql","utf8");
  assert.match(migration,/status = 'running'::public\.import_status/);
  assert.match(migration,/'completed_with_warnings'::public\.import_status/);
  assert.match(migration,/'completed'::public\.import_status/);
  assert.match(migration,/status='failed'::public\.import_status/);
  assert.match(migration,/Finalize enum assignment probe failed/);
  assert.match(migration,/Failure enum assignment probe failed/);
});

test("live routes disclose provenance and Stripe boundary",()=>{
  const dashboard=readFileSync("components/dashboard/live-executive-dashboard.tsx","utf8");
  const detail=readFileSync("app/claims/[id]/page.tsx","utf8");
  const validation=readFileSync("app/admin/imports/q2-2026/page.tsx","utf8");
  assert.match(dashboard,/Q2 2026 Live Archive Data/);
  assert.match(dashboard,/Stripe not yet connected/);
  assert.match(detail,/TECHNICAL PROVENANCE/);
  assert.match(validation,/EXPECTED VS ACTUAL/);
});
