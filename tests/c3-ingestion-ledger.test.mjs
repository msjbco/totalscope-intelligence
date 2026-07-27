import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/202607270001_c3_ingestion_ledger.sql", "utf8");

test("C3 ingestion migration is additive and preserves the C1 importer", () => {
  assert.doesNotMatch(migration, /drop\s+(table|function|type|view)/i);
  assert.doesNotMatch(migration, /alter\s+table\s+public\.(import_jobs|source_rows|claims|claim_updates)/i);
  assert.doesNotMatch(migration, /create\s+or\s+replace\s+function\s+public\.import_q2_2026_archive/i);
  assert.match(migration, /Existing C1\/C2 migrations and the Q2 importer remain unchanged/);
});

test("generalized ingestion ledger records contracts, artifacts, runs, attempts, and issues", () => {
  for (const table of [
    "source_contracts",
    "source_artifacts",
    "ingestion_runs",
    "ingestion_run_artifacts",
    "ingestion_run_steps",
    "ingestion_records",
    "normalization_attempts",
    "ingestion_issues",
  ]) {
    assert.match(migration, new RegExp(`create table public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test("run identity supports deterministic full and incremental retry", () => {
  assert.match(migration, /ingestion_mode text not null check \(ingestion_mode in \('full','incremental'\)\)/);
  assert.match(migration, /artifact_set_fingerprint text not null/);
  assert.match(migration, /unique \(source_system, dataset_type, artifact_set_fingerprint, parser_version, mapping_version\)/);
  assert.match(migration, /unique \(ingestion_run_id, step_name, batch_sequence, retry_number\)/);
});

test("raw records and normalization attempts are immutable and retain timezone metadata", () => {
  assert.match(migration, /raw_payload is not null or protected_payload_pointer is not null/);
  assert.match(migration, /source_timezone_status public\.timezone_status/);
  for (const trigger of ["source_artifacts_immutable", "ingestion_records_immutable", "normalization_attempts_immutable"]) {
    assert.match(migration, new RegExp(`create trigger ${trigger}`));
  }
  assert.match(migration, /execute function public\.prevent_immutable_source_mutation\(\)/);
});

test("new ingestion tables deny browser roles and reserve mutation for service role", () => {
  assert.match(migration, /revoke all on public\.source_contracts[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(migration, /grant .*\bto authenticated/);
  assert.match(migration, /to service_role/);
});

test("ingestion issues use run-scoped deterministic keys", () => {
  assert.match(migration, /unique \(ingestion_run_id, deterministic_key\)/);
  assert.match(migration, /severity text not null check \(severity in \('info','warning','error','critical'\)\)/);
  assert.match(migration, /status public\.review_status/);
});
