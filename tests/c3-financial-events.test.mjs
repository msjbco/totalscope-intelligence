import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/migrations/202607270003_c3_financial_events.sql", "utf8");
const importer = readFileSync("scripts/c3/ingest-fixtures.mjs", "utf8");

test("refunds, failures, disputes, and processor fees are first-class events", () => {
  for (const table of ["refund_events", "payment_failure_events", "dispute_events", "processor_fee_events"]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
  }
});

test("missing financial amounts cannot be represented as zero", () => {
  assert.match(sql, /amount_availability public\.availability_status not null/);
  assert.match(sql, /availability = 'captured' and amount_minor is not null/);
  assert.match(sql, /availability <> 'captured' and amount_minor is null/);
});

test("financial events retain ingestion provenance and browser roles are revoked", () => {
  assert.match(sql, /ingestion_record_id uuid not null references public\.ingestion_records/);
  assert.match(sql, /ingestion_run_id uuid not null references public\.ingestion_runs/);
  assert.match(sql, /revoke all on table public\.%I from anon, authenticated/);
  assert.match(importer, /promoteFinancialFixtures/);
});
