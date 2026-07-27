import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/migrations/202607270004_c3_browser_interfaces.sql", "utf8");

test("C3 browser views are security-invoker interfaces", () => {
  for (const view of ["c3_operations_files", "c3_handler_performance_inputs", "c3_data_health"]) {
    assert.match(sql, new RegExp(`create view public\\.${view}\\s+with \\(security_invoker = true\\)`));
  }
});

test("viewers receive approved facts but no raw transaction identifiers", () => {
  assert.match(sql, /active users read approved file financial facts/);
  assert.match(sql, /staging admins read payment events/);
  assert.doesNotMatch(sql, /grant select \(id, stable_payment_id/);
  assert.doesNotMatch(sql, /grant select .*ingestion_record_id.*payment_events/);
});

test("Data Health and lineage require staging administrator RLS", () => {
  assert.match(sql, /staging admins read C3 ingestion runs/);
  assert.match(sql, /staging admins read C3 lineage/);
  assert.match(sql, /using \(\(select private\.is_staging_admin\(\)\)\)/);
});

test("anonymous access and browser mutation remain denied", () => {
  assert.match(sql, /revoke all on public\.c3_operations_files[\s\S]*from public, anon/);
  assert.match(sql, /revoke insert, update, delete, truncate, references, trigger[\s\S]*from anon, authenticated/);
});
