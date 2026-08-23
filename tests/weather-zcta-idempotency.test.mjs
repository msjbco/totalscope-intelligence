import test from "node:test";
import assert from "node:assert/strict";
import { evaluateZctaImportState } from "../scripts/weather/zcta-import-idempotency.mjs";

const requested = { version: "2025-tiger-line-zcta520", sourceSha256: "a".repeat(64), expectedRecordCount: 33791 };
const active = { version: requested.version, status: "active", source_sha256: requested.sourceSha256, expected_record_count: 33791, imported_record_count: 33791 };
const evaluate = (overrides = {}, geometryCount = 33791) => evaluateZctaImportState({ activeVersions: [{ ...active, ...overrides }], geometryCount, requested });

test("exact complete active dataset short-circuits without geometry work", () => {
  assert.deepEqual(evaluate(), { shortCircuit: true, reason: "exact-active-dataset" });
});

test("changed fingerprint does not short-circuit", () => assert.equal(evaluate({ source_sha256: "b".repeat(64) }).shortCircuit, false));
test("changed version does not short-circuit", () => assert.equal(evaluate({ version: "2026-tiger-line-zcta520" }, null).shortCircuit, false));
test("incomplete imported count does not short-circuit", () => assert.equal(evaluate({ imported_record_count: 33790 }).shortCircuit, false));
test("incomplete geometry count does not short-circuit", () => assert.equal(evaluate({}, 33790).shortCircuit, false));
test("inactive or in-progress state does not short-circuit", () => {
  assert.deepEqual(evaluateZctaImportState({ activeVersions: [], geometryCount: null, requested }), { shortCircuit: false, reason: "no-active-dataset" });
});
test("multiple active versions fail explicitly", () => {
  assert.throws(() => evaluateZctaImportState({ activeVersions: [active, { ...active, version: "2026-tiger-line-zcta520" }], geometryCount: 33791, requested }), /2 active dataset versions/);
});
