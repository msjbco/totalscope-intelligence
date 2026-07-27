import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inspect } from "../scripts/c3/ingest-fixtures.mjs";

const source = readFileSync("scripts/c3/ingest-fixtures.mjs", "utf8");

test("C3 fixture adapter produces a deterministic bounded import plan", () => {
  const first = inspect();
  const second = inspect();
  assert.deepEqual(first, second);
  assert.equal(first.batchSize, 100);
  assert.equal(first.plans.length, 2);
  assert.deepEqual(first.plans.map((plan) => plan.recordCount), [46, 21]);
  for (const plan of first.plans) {
    assert.match(plan.artifactSetFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(plan.ingestionMode, "full");
  }
});

test("C3 import requires explicit target and hosted project confirmation", () => {
  assert.match(source, /TOTALSCOPE_IMPORT_TARGET/);
  assert.match(source, /--confirm-target/);
  assert.match(source, /TOTALSCOPE_IMPORT_PROJECT_REF/);
  assert.match(source, /confirm-project-ref/);
  assert.match(source, /Production-like target rejected/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/);
});

test("C3 import records retry attempts and ignores immutable duplicate rows", () => {
  assert.match(source, /resolution=ignore-duplicates/);
  assert.match(source, /retry_number\.desc/);
  assert.match(source, /nextRetry/);
  assert.match(source, /normalization_attempts/);
  assert.match(source, /status: "failed"/);
});

test("C3 adapter never promotes fixture rows into C1 canonical tables", () => {
  for (const table of ["claims", "claim_updates", "claim_financial_facts", "claim_derived_metrics"]) {
    assert.doesNotMatch(source, new RegExp(`rest\\(config, ["'\`]${table}`));
    assert.doesNotMatch(source, new RegExp(`insertIgnoringConflicts\\(config, ["'\`]${table}`));
  }
});
