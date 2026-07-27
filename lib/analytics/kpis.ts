import type { AnalyticsConfiguration } from "./config.ts";
import { evaluateOperations } from "./engine.ts";
import type { AnalyticsFile, AnalyticsInput, Availability } from "./types.ts";

export const KPI_DEFINITION_VERSION = "c3-kpi-v1" as const;

export type KpiCategory = "operations" | "financial" | "performance" | "data_health";
export type KpiValue = number | null | Record<string, number>;

export interface KpiDefinition {
  key: string;
  version: typeof KPI_DEFINITION_VERSION;
  label: string;
  category: KpiCategory;
  unit: "count" | "currency_minor" | "days" | "ratio" | "percent" | "distribution";
  explanation: string;
}

export interface EvaluatedKpi extends KpiDefinition {
  value: KpiValue;
  numerator: number | null;
  denominator: number;
  coveragePercent: number;
  status: "measured" | "inferred" | "unavailable";
}

const definition = (
  key: string,
  label: string,
  category: KpiCategory,
  unit: KpiDefinition["unit"],
  explanation: string,
): KpiDefinition => ({ key, version: KPI_DEFINITION_VERSION, label, category, unit, explanation });

export const KPI_DEFINITIONS: readonly KpiDefinition[] = [
  definition("new_files", "New files", "operations", "count", "Files submitted within the selected period."),
  definition("active_files", "Active files", "operations", "count", "Files without an authoritative completion timestamp."),
  definition("completed_files", "Completed files", "operations", "count", "Files with an authoritative completion timestamp."),
  definition("estimate_only_files", "Estimate-only files", "operations", "count", "Files delivered under estimate-only service."),
  definition("claim_handling_files", "Claim-handling files", "operations", "count", "Files delivered under claim-handling service."),
  definition("files_by_status", "Files by status", "operations", "distribution", "File count grouped by current authoritative status."),
  definition("files_by_stage", "Files by stage", "operations", "distribution", "File count grouped by normalized lifecycle stage."),
  definition("files_by_client", "Files by client", "operations", "distribution", "File count grouped by canonical client."),
  definition("files_by_branch", "Files by branch", "operations", "distribution", "File count grouped by canonical branch."),
  definition("files_by_estimator", "Files by estimator", "operations", "distribution", "File count grouped by active estimator assignment."),
  definition("files_by_claim_handler", "Files by claim handler", "operations", "distribution", "File count grouped by active claim-handler assignment."),
  definition("aging_files", "Aging files", "operations", "count", "Active files open at least 30 days as of the evaluation timestamp."),
  definition("stalled_files", "Stalled files", "operations", "count", "Active files with no activity inside the configured stalled-file window."),
  definition("completion_volume", "Completion volume", "operations", "count", "Files completed within the selected period."),
  definition("average_cycle_time", "Average cycle time", "operations", "days", "Mean elapsed days from submission to completion."),
  definition("median_cycle_time", "Median cycle time", "operations", "days", "Median elapsed days from submission to completion."),
  definition("estimate_fees", "Estimate fees", "financial", "currency_minor", "Captured, approved, client-billable estimate charges."),
  definition("claim_handling_fees", "Claim-handling fees", "financial", "currency_minor", "Captured, approved, client-billable claim-handling charges."),
  definition("approved_charges", "Approved client-billable charges", "financial", "currency_minor", "Captured, non-voided, client-billable charges."),
  definition("initial_carrier_amount", "Initial carrier amount", "financial", "currency_minor", "Sum of captured initial RCV facts."),
  definition("final_settlement_amount", "Final settlement amount", "financial", "currency_minor", "Sum of captured final RCV facts."),
  definition("settlement_gain", "Settlement gain", "financial", "currency_minor", "Final RCV less initial RCV where both are captured."),
  definition("client_net_gain", "Client net gain", "financial", "currency_minor", "Settlement gain less approved charges, refunds, and processor fees."),
  definition("roi", "ROI", "financial", "ratio", "Client net gain divided by approved charges."),
  definition("invoiced_amount", "Invoiced amount", "financial", "currency_minor", "Captured non-voided invoice charges."),
  definition("collected_amount", "Collected amount", "financial", "currency_minor", "Settled payment amounts."),
  definition("outstanding_amount", "Outstanding amount", "financial", "currency_minor", "Invoiced amount less settled collections and succeeded refunds."),
  definition("refunds", "Refunds", "financial", "currency_minor", "Succeeded refund amounts."),
  definition("failed_payments", "Failed payments", "financial", "count", "First-class failed payment events."),
  definition("disputes", "Disputes", "financial", "count", "First-class dispute events."),
  definition("processor_fees", "Processor fees", "financial", "currency_minor", "Processor fees associated with settled payments."),
  definition("net_collections", "Net collections", "financial", "currency_minor", "Settled collections less refunds and processor fees."),
] as const;

const DAY_MS = 86_400_000;
const days = (start: string, end: string) => Math.max(0, (Date.parse(end) - Date.parse(start)) / DAY_MS);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const group = (files: AnalyticsFile[], select: (file: AnalyticsFile) => string | null) =>
  files.reduce<Record<string, number>>((result, file) => {
    const key = select(file) ?? "Unavailable";
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
const availability = (values: Array<{ amountMinor: number | null; availability: Availability }>) => {
  const captured = values.filter((value) => value.availability === "captured" && value.amountMinor !== null);
  return {
    value: captured.length ? sum(captured.map((value) => value.amountMinor!)) : null,
    denominator: values.length,
    covered: captured.length,
  };
};

export function evaluateKpis(
  input: AnalyticsInput & {
    periodStart: string;
    periodEnd: string;
    estimatorAssignments?: Record<string, string>;
    claimHandlerAssignments?: Record<string, string>;
    disputes?: Array<{ amountMinor: number }>;
  },
  configuration: AnalyticsConfiguration,
): EvaluatedKpi[] {
  const base = evaluateOperations(input, configuration);
  const completedDurations = input.files
    .filter((file) => file.submittedAt && file.completedAt)
    .map((file) => days(file.submittedAt!, file.completedAt!));
  const inPeriod = (value: string | null) => value !== null && value >= input.periodStart && value <= input.periodEnd;
  const capturedInitial = availability(input.financialFacts.filter((fact) => fact.metricKey === "initial_rcv"));
  const capturedFinal = availability(input.financialFacts.filter((fact) => fact.metricKey === "final_rcv"));
  const settled = input.payments.filter((payment) => payment.status === "settled");
  const collected = sum(settled.map((payment) => payment.amountMinor));
  const refund = base.revenue.refunds.value ?? 0;
  const processor = sum(input.processorFees.filter((fee) => settled.some((payment) => payment.id === fee.paymentId)).map((fee) => fee.amountMinor));
  const scalar = new Map<string, Omit<EvaluatedKpi, keyof KpiDefinition>>([
    ["new_files", { value: input.files.filter((file) => inPeriod(file.submittedAt)).length, numerator: null, denominator: input.files.length, coveragePercent: input.files.length ? input.files.filter((file) => file.submittedAt).length / input.files.length * 100 : 100, status: "measured" }],
    ["active_files", { value: base.fileCounts.active, numerator: base.fileCounts.active, denominator: input.files.length, coveragePercent: 100, status: "measured" }],
    ["completed_files", { value: base.fileCounts.completed, numerator: base.fileCounts.completed, denominator: input.files.length, coveragePercent: 100, status: "measured" }],
    ["estimate_only_files", { value: base.fileCounts.estimateOnly, numerator: base.fileCounts.estimateOnly, denominator: input.files.length, coveragePercent: 100, status: "measured" }],
    ["claim_handling_files", { value: base.fileCounts.claimHandling, numerator: base.fileCounts.claimHandling, denominator: input.files.length, coveragePercent: 100, status: "measured" }],
    ["files_by_status", { value: group(input.files, (file) => file.status), numerator: null, denominator: input.files.length, coveragePercent: 100, status: "measured" }],
    ["files_by_stage", { value: group(input.files, (file) => file.completedAt ? "completed" : file.status === "claim_handling" ? "claim_handling" : "in_progress"), numerator: null, denominator: input.files.length, coveragePercent: 100, status: "inferred" }],
    ["files_by_client", { value: group(input.files, (file) => file.clientId), numerator: null, denominator: input.files.length, coveragePercent: 100, status: "measured" }],
    ["files_by_branch", { value: group(input.files, (file) => file.branchId), numerator: null, denominator: input.files.length, coveragePercent: 100, status: "measured" }],
    ["files_by_estimator", { value: group(input.files, (file) => input.estimatorAssignments?.[file.id] ?? null), numerator: null, denominator: input.files.length, coveragePercent: input.files.length ? Object.keys(input.estimatorAssignments ?? {}).length / input.files.length * 100 : 100, status: "measured" }],
    ["files_by_claim_handler", { value: group(input.files, (file) => input.claimHandlerAssignments?.[file.id] ?? file.handlerId), numerator: null, denominator: input.files.length, coveragePercent: input.files.length ? input.files.filter((file) => input.claimHandlerAssignments?.[file.id] ?? file.handlerId).length / input.files.length * 100 : 100, status: "measured" }],
    ["aging_files", { value: input.files.filter((file) => !file.completedAt && file.submittedAt && days(file.submittedAt, input.asOf) >= 30).length, numerator: null, denominator: base.fileCounts.active, coveragePercent: base.fileCounts.active ? input.files.filter((file) => !file.completedAt && file.submittedAt).length / base.fileCounts.active * 100 : 100, status: "measured" }],
    ["stalled_files", { value: input.files.filter((file) => !file.completedAt && file.lastActivityAt && days(file.lastActivityAt, input.asOf) >= configuration.stalledFileDays).length, numerator: null, denominator: base.fileCounts.active, coveragePercent: base.fileCounts.active ? input.files.filter((file) => !file.completedAt && file.lastActivityAt).length / base.fileCounts.active * 100 : 100, status: "measured" }],
    ["completion_volume", { value: input.files.filter((file) => inPeriod(file.completedAt)).length, numerator: null, denominator: input.files.length, coveragePercent: input.files.length ? input.files.filter((file) => file.completedAt).length / input.files.length * 100 : 100, status: "measured" }],
    ["average_cycle_time", { value: base.cycle.averageDaysToClose.value, numerator: base.cycle.averageDaysToClose.numerator, denominator: base.cycle.averageDaysToClose.denominator, coveragePercent: base.cycle.averageDaysToClose.coveragePercent, status: base.cycle.averageDaysToClose.status }],
    ["median_cycle_time", { value: median(completedDurations), numerator: null, denominator: input.files.length, coveragePercent: input.files.length ? completedDurations.length / input.files.length * 100 : 100, status: completedDurations.length ? "measured" : "unavailable" }],
    ["estimate_fees", { ...base.revenue.estimate }],
    ["claim_handling_fees", { ...base.revenue.claimHandling }],
    ["approved_charges", { ...base.revenue.fees }],
    ["initial_carrier_amount", { value: capturedInitial.value, numerator: capturedInitial.value, denominator: capturedInitial.denominator, coveragePercent: capturedInitial.denominator ? capturedInitial.covered / capturedInitial.denominator * 100 : 100, status: capturedInitial.value === null ? "unavailable" : "measured" }],
    ["final_settlement_amount", { value: capturedFinal.value, numerator: capturedFinal.value, denominator: capturedFinal.denominator, coveragePercent: capturedFinal.denominator ? capturedFinal.covered / capturedFinal.denominator * 100 : 100, status: capturedFinal.value === null ? "unavailable" : "measured" }],
    ["settlement_gain", { ...base.settlement.gains }],
    ["client_net_gain", { ...base.settlement.clientNetGain }],
    ["roi", { ...base.settlement.roi }],
    ["invoiced_amount", { ...base.revenue.fees }],
    ["collected_amount", { value: collected, numerator: collected, denominator: input.payments.length, coveragePercent: input.payments.length ? settled.length / input.payments.length * 100 : 100, status: "measured" }],
    ["outstanding_amount", { value: base.revenue.fees.value === null ? null : base.revenue.fees.value - collected + refund, numerator: null, denominator: base.revenue.fees.denominator, coveragePercent: base.revenue.fees.coveragePercent, status: base.revenue.fees.value === null ? "unavailable" : "measured" }],
    ["refunds", { ...base.revenue.refunds }],
    ["failed_payments", { ...base.revenue.failedPayments }],
    ["disputes", { value: input.disputes?.length ?? 0, numerator: input.disputes?.length ?? 0, denominator: input.disputes?.length ?? 0, coveragePercent: 100, status: "measured" }],
    ["processor_fees", { value: processor, numerator: processor, denominator: input.processorFees.length, coveragePercent: 100, status: "measured" }],
    ["net_collections", { value: collected - refund - processor, numerator: collected - refund - processor, denominator: input.payments.length, coveragePercent: 100, status: "measured" }],
  ]);
  return KPI_DEFINITIONS.map((item) => ({ ...item, ...scalar.get(item.key)! }));
}
