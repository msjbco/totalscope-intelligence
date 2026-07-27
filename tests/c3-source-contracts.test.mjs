import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inspectFixtures, loadFixturePackage, validateContract, validateFixturePackage } from "../scripts/c3/validate-fixtures.mjs";

test("C3 source contracts support full and incremental multi-table exports", () => {
  const pkg = loadFixturePackage();
  assert.deepEqual(Object.keys(pkg.contracts).sort(), ["stripe-periodic-v1", "tsi-historical-v1"]);
  for (const contract of Object.values(pkg.contracts)) {
    assert.deepEqual(validateContract(contract), []);
    assert.deepEqual(contract.modeSupport, ["full", "incremental"]);
  }
  assert.equal(pkg.contracts["tsi-historical-v1"].stableFileIdField, "totalscope_file_id");
  assert.ok(pkg.contracts["tsi-historical-v1"].tables.length > 1);
});

test("deterministic C3 fixtures satisfy contracts and relationships", () => {
  const first = inspectFixtures();
  const second = inspectFixtures();
  assert.equal(first.status, "pass", first.errors.join("\n"));
  assert.deepEqual(first, second);
  assert.match(first.fingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.tableCounts, {
    assignments: 6,
    branches: 3,
    clients: 2,
    custom_fields: 2,
    disputes: 1,
    documents: 2,
    files: 6,
    financial_facts: 6,
    invoice_charges: 6,
    invoices: 4,
    notes: 2,
    payment_failures: 2,
    payments: 4,
    processor_fees: 3,
    refunds: 1,
    status_history: 12,
    tags: 2,
    users: 3,
  });
});

test("explicit zero remains distinct from missing financial data", () => {
  const pkg = loadFixturePackage();
  const result = validateFixturePackage(pkg);
  assert.equal(result.status, "pass", result.errors.join("\n"));
  const files = pkg.datasets["tsi-historical-v1"].files;
  assert.equal(files.find((row) => row.totalscope_file_id === "TSI-1003").initial_rcv_minor, 0);
  assert.equal(files.find((row) => row.totalscope_file_id === "TSI-1005").initial_rcv_minor, null);
  assert.equal(files.find((row) => row.totalscope_file_id === "TSI-1005").financial_availability, "not_captured");
});

test("refunds, failures, payments, disputes, and processor fees are separate datasets", () => {
  const pkg = loadFixturePackage();
  const stripe = pkg.datasets["stripe-periodic-v1"];
  for (const table of ["payments", "refunds", "payment_failures", "disputes", "processor_fees"]) {
    assert.ok(Array.isArray(stripe[table]));
    assert.ok(stripe[table].length > 0);
  }
  assert.equal(stripe.payment_failures.some((event) => event.amount_minor === null), true);
  assert.equal(stripe.payments.some((event) => event.amount_minor === 0), true);
});

test("C3 fixture scope excludes photos and contains no real credentials", () => {
  const manifest = readFileSync("tests/fixtures/c3/manifest.json", "utf8");
  const contracts = readFileSync("config/source-contracts/tsi-historical-v1.json", "utf8")
    + readFileSync("config/source-contracts/stripe-periodic-v1.json", "utf8");
  assert.doesNotMatch(manifest + contracts, /photo|image_file/i);
  assert.doesNotMatch(manifest + contracts, /service_role|postgresql:\/\/|sk_live_/i);
});
