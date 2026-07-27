import assert from "node:assert/strict";
import test from "node:test";
import { getAnalyticsConfiguration } from "../lib/analytics/config.ts";
import { evaluateOperations } from "../lib/analytics/engine.ts";

const input = {
  asOf: "2026-07-01T00:00:00Z",
  files: [
    { id: "f1", clientId: "c1", branchId: "b1", handlerId: "h1", carrierName: "Carrier A", serviceType: "estimate_only", status: "completed", submittedAt: "2026-06-01T00:00:00Z", completedAt: "2026-06-11T00:00:00Z", lastActivityAt: "2026-06-11T00:00:00Z" },
    { id: "f2", clientId: "c1", branchId: "b1", handlerId: "h1", carrierName: "Carrier A", serviceType: "claim_handling", status: "active", submittedAt: "2026-05-01T00:00:00Z", completedAt: null, lastActivityAt: "2026-06-01T00:00:00Z" },
  ],
  financialFacts: [
    { fileId: "f1", metricKey: "initial_rcv", amountMinor: 100_000, availability: "captured" },
    { fileId: "f1", metricKey: "final_rcv", amountMinor: 140_000, availability: "captured" },
    { fileId: "f2", metricKey: "initial_rcv", amountMinor: null, availability: "not_captured" },
  ],
  invoiceCharges: [
    { fileId: "f1", chargeType: "estimate_fee", amountMinor: 10_000, availability: "captured", clientBillable: true, voided: false },
    { fileId: "f2", chargeType: "claim_handling_fee", amountMinor: null, availability: "not_captured", clientBillable: true, voided: false },
  ],
  payments: [{ id: "p1", fileId: "f1", amountMinor: 10_000, status: "settled" }],
  refunds: [{ paymentId: "p1", amountMinor: 1_000, status: "succeeded" }],
  paymentFailures: [{ fileId: "f2", amountMinor: null }],
  processorFees: [{ paymentId: "p1", amountMinor: 300 }],
};

test("analytics configuration defaults and overrides comparative cohort size centrally", () => {
  assert.equal(getAnalyticsConfiguration({}).minimumComparativeCohortSize, 10);
  assert.equal(getAnalyticsConfiguration({ TSI_MINIMUM_COMPARATIVE_COHORT_SIZE: "25" }).minimumComparativeCohortSize, 25);
  assert.throws(() => getAnalyticsConfiguration({ TSI_MINIMUM_COMPARATIVE_COHORT_SIZE: "0" }));
});

test("analytics engine preserves missing money and computes only captured values", () => {
  const result = evaluateOperations(input, getAnalyticsConfiguration({}));
  assert.equal(result.fileCounts.total, 2);
  assert.equal(result.revenue.estimate.value, 10_000);
  assert.equal(result.revenue.claimHandling.value, null);
  assert.equal(result.revenue.claimHandling.coveragePercent, 0);
  assert.equal(result.settlement.gains.value, 40_000);
  assert.equal(result.settlement.clientNetGain.value, 28_700);
  assert.equal(result.settlement.roi.value, 2.87);
});

test("performance comparisons obey the configured completed-file cohort threshold", () => {
  const defaultResult = evaluateOperations(input, getAnalyticsConfiguration({}));
  assert.equal(defaultResult.performance.handlers[0].eligibleForComparison, false);
  const configuredResult = evaluateOperations(input, getAnalyticsConfiguration({ TSI_MINIMUM_COMPARATIVE_COHORT_SIZE: "1" }));
  assert.equal(configuredResult.performance.handlers[0].eligibleForComparison, true);
});

test("cycle-time and billing readiness are evaluated as of a supplied deterministic timestamp", () => {
  const result = evaluateOperations(input, getAnalyticsConfiguration({}));
  assert.equal(result.cycle.averageDaysToClose.value, 10);
  assert.equal(result.cycle.averageDaysOpen.value, 61);
  assert.equal(result.cycle.approachingClaimHandlingBilling, 1);
});
