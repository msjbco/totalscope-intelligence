import type { AnalyticsConfiguration } from "./config";
import type {
  AnalyticsFile,
  AnalyticsInput,
  AnalyticsResult,
  MetricResult,
  PerformanceRow,
} from "./types";

const DAY_MS = 86_400_000;

function daysBetween(start: string, end: string): number {
  return Math.max(0, (Date.parse(end) - Date.parse(start)) / DAY_MS);
}

function measured(
  value: number | null,
  numerator: number | null,
  denominator: number,
  covered: number,
  explanation: string,
): MetricResult {
  return {
    value,
    numerator,
    denominator,
    coveragePercent: denominator === 0 ? 100 : (covered / denominator) * 100,
    status: value === null ? "unavailable" : "measured",
    explanation,
  };
}

function sumCharges(input: AnalyticsInput, chargeType?: string): MetricResult {
  const eligible = input.invoiceCharges.filter(
    (charge) => charge.clientBillable && !charge.voided && (!chargeType || charge.chargeType === chargeType),
  );
  const captured = eligible.filter(
    (charge) => charge.availability === "captured" && charge.amountMinor !== null,
  );
  const value = captured.length === 0 ? null : captured.reduce((sum, charge) => sum + charge.amountMinor!, 0);
  return measured(
    value,
    value,
    eligible.length,
    captured.length,
    "Sum of captured, client-billable, non-voided invoice charges. Missing amounts are excluded, never zero-filled.",
  );
}

function settlementGain(input: AnalyticsInput): MetricResult {
  const byFile = new Map<string, Map<string, number>>();
  for (const fact of input.financialFacts) {
    if (fact.availability !== "captured" || fact.amountMinor === null) continue;
    const facts = byFile.get(fact.fileId) ?? new Map<string, number>();
    facts.set(fact.metricKey, fact.amountMinor);
    byFile.set(fact.fileId, facts);
  }
  const eligibleFiles = new Set(input.financialFacts.map((fact) => fact.fileId)).size;
  const gains = [...byFile.values()]
    .filter((facts) => facts.has("initial_rcv") && facts.has("final_rcv"))
    .map((facts) => facts.get("final_rcv")! - facts.get("initial_rcv")!);
  const value = gains.length === 0 ? null : gains.reduce((sum, gain) => sum + gain, 0);
  return measured(
    value,
    value,
    eligibleFiles,
    gains.length,
    "Final RCV minus initial RCV for files where both captured facts are available.",
  );
}

function averageDuration(files: AnalyticsFile[], asOf: string, closedOnly: boolean): MetricResult {
  const eligible = files.filter((file) => file.submittedAt && (closedOnly ? file.completedAt : !file.completedAt));
  const durations = eligible.map((file) =>
    daysBetween(file.submittedAt!, closedOnly ? file.completedAt! : asOf),
  );
  const value = durations.length === 0
    ? null
    : durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  return measured(value, durations.length === 0 ? null : durations.reduce((a, b) => a + b, 0), files.length, durations.length,
    closedOnly ? "Average elapsed days from submission to completion." : "Average elapsed days for files not completed as of the evaluation timestamp.");
}

function performance(
  files: AnalyticsFile[],
  dimension: (file: AnalyticsFile) => string | null,
  minimumCohort: number,
): PerformanceRow[] {
  const groups = new Map<string, AnalyticsFile[]>();
  for (const file of files) {
    const key = dimension(file);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }
  return [...groups.entries()].map(([dimensionId, group]) => {
    const completed = group.filter((file) => file.submittedAt && file.completedAt);
    const averageDaysToClose = completed.length === 0
      ? null
      : completed.reduce((sum, file) => sum + daysBetween(file.submittedAt!, file.completedAt!), 0) / completed.length;
    return {
      dimensionId,
      submittedFiles: group.length,
      completedFiles: completed.length,
      averageDaysToClose,
      eligibleForComparison: completed.length >= minimumCohort,
    };
  }).sort((a, b) => b.completedFiles - a.completedFiles || a.dimensionId.localeCompare(b.dimensionId));
}

export function evaluateOperations(
  input: AnalyticsInput,
  configuration: AnalyticsConfiguration,
): AnalyticsResult {
  const completed = input.files.filter((file) => file.completedAt !== null);
  const active = input.files.filter((file) => file.completedAt === null);
  const estimate = sumCharges(input, "estimate_fee");
  const claimHandling = sumCharges(input, "claim_handling_fee");
  const fees = sumCharges(input);
  const gains = settlementGain(input);
  const payments = input.payments.filter((payment) => payment.status === "settled");
  const paymentIds = new Set(payments.map((payment) => payment.id));
  const refundValue = input.refunds
    .filter((refund) => refund.status === "succeeded" && paymentIds.has(refund.paymentId))
    .reduce((sum, refund) => sum + refund.amountMinor, 0);
  const processorFees = input.processorFees
    .filter((fee) => paymentIds.has(fee.paymentId))
    .reduce((sum, fee) => sum + fee.amountMinor, 0);
  const clientNetGainValue = gains.value === null || fees.value === null
    ? null
    : gains.value - fees.value - refundValue - processorFees;
  const roiValue = clientNetGainValue === null || fees.value === null || fees.value === 0
    ? null
    : clientNetGainValue / fees.value;
  const asOf = input.asOf;

  return {
    fileCounts: {
      total: input.files.length,
      estimateOnly: input.files.filter((file) => file.serviceType === "estimate_only").length,
      claimHandling: input.files.filter((file) => file.serviceType === "claim_handling").length,
      active: active.length,
      completed: completed.length,
    },
    revenue: {
      estimate,
      claimHandling,
      fees,
      refunds: measured(refundValue, refundValue, input.refunds.length, input.refunds.length, "Succeeded refunds linked to settled payments."),
      failedPayments: measured(input.paymentFailures.length, input.paymentFailures.length, input.paymentFailures.length, input.paymentFailures.length, "Count of first-class failed payment events."),
    },
    settlement: {
      gains,
      clientNetGain: measured(clientNetGainValue, clientNetGainValue, gains.denominator, gains.value === null ? 0 : gains.denominator, "Settlement gains less billable fees, succeeded refunds, and processor fees."),
      roi: measured(roiValue, clientNetGainValue, fees.denominator, fees.value === null ? 0 : fees.denominator, "Client net gain divided by TotalScope billable fees; unavailable when fees are missing or zero."),
    },
    cycle: {
      averageDaysOpen: averageDuration(input.files, asOf, false),
      averageDaysToClose: averageDuration(input.files, asOf, true),
      approachingClaimHandlingBilling: active.filter((file) =>
        file.serviceType === "claim_handling"
        && file.submittedAt !== null
        && daysBetween(file.submittedAt, asOf) >= configuration.approachingClaimHandlingBillingDays
      ).length,
    },
    performance: {
      handlers: performance(input.files, (file) => file.handlerId, configuration.minimumComparativeCohortSize),
      carriers: performance(input.files, (file) => file.carrierName, configuration.minimumComparativeCohortSize),
    },
  };
}
