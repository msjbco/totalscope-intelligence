import assignments from "@/tests/fixtures/c3/assignments.json";
import branches from "@/tests/fixtures/c3/branches.json";
import clients from "@/tests/fixtures/c3/clients.json";
import disputes from "@/tests/fixtures/c3/disputes.json";
import documents from "@/tests/fixtures/c3/documents.json";
import facts from "@/tests/fixtures/c3/financial-facts.json";
import files from "@/tests/fixtures/c3/files.json";
import charges from "@/tests/fixtures/c3/invoice-charges.json";
import invoices from "@/tests/fixtures/c3/invoices.json";
import notes from "@/tests/fixtures/c3/notes.json";
import failures from "@/tests/fixtures/c3/payment-failures.json";
import payments from "@/tests/fixtures/c3/payments.json";
import fees from "@/tests/fixtures/c3/processor-fees.json";
import refunds from "@/tests/fixtures/c3/refunds.json";
import statuses from "@/tests/fixtures/c3/status-history.json";
import users from "@/tests/fixtures/c3/users.json";
import { getAnalyticsConfiguration } from "@/lib/analytics/config";
import { evaluateKpis, type EvaluatedKpi } from "@/lib/analytics/kpis";
import { evaluateOperations } from "@/lib/analytics/engine";
import type { AnalyticsInput } from "@/lib/analytics/types";

const invoiceById = new Map(invoices.map((invoice) => [invoice.invoice_id, invoice]));
const assignmentsByFile = new Map(assignments.map((assignment) => [assignment.totalscope_file_id, assignment]));
const usersById = new Map(users.map((user) => [user.user_id, user]));
const clientsById = new Map(clients.map((client) => [client.client_id, client]));
const branchesById = new Map(branches.map((branch) => [branch.branch_id, branch]));

const analyticsInput: AnalyticsInput & {
  periodStart: string;
  periodEnd: string;
  estimatorAssignments: Record<string, string>;
  claimHandlerAssignments: Record<string, string>;
  disputes: Array<{ amountMinor: number }>;
} = {
  asOf: "2026-06-30T23:59:59-04:00",
  periodStart: "2026-01-01T00:00:00-05:00",
  periodEnd: "2026-06-30T23:59:59-04:00",
  files: files.map((file) => {
    const assignment = assignmentsByFile.get(file.totalscope_file_id);
    return {
      id: file.totalscope_file_id,
      clientId: file.client_id,
      branchId: file.branch_id,
      handlerId: assignment?.assignment_type === "totalscope_claim_handler" ? assignment.user_id : null,
      carrierName: file.carrier_name,
      serviceType: file.service_type as "estimate_only" | "claim_handling",
      status: file.current_status,
      submittedAt: file.submitted_at,
      completedAt: file.completed_at,
      lastActivityAt: file.updated_at,
    };
  }),
  financialFacts: facts.map((fact) => ({
    fileId: fact.totalscope_file_id,
    metricKey: fact.metric_key as "initial_rcv" | "final_rcv",
    amountMinor: fact.amount_minor,
    availability: fact.availability as "captured" | "not_captured",
  })),
  invoiceCharges: charges.map((charge) => ({
    fileId: invoiceById.get(charge.invoice_id)?.totalscope_file_id ?? "",
    chargeType: charge.charge_type,
    amountMinor: charge.amount_minor,
    availability: charge.availability as "captured" | "not_captured",
    clientBillable: charge.client_billable,
    voided: charge.voided,
  })),
  payments: payments.map((payment) => ({ id: payment.payment_id, fileId: payment.totalscope_file_id, amountMinor: payment.amount_minor, status: payment.status })),
  refunds: refunds.map((refund) => ({ paymentId: refund.payment_id, amountMinor: refund.amount_minor, status: refund.status })),
  paymentFailures: failures.map((failure) => ({ fileId: failure.invoice_id ? invoiceById.get(failure.invoice_id)?.totalscope_file_id ?? null : null, amountMinor: failure.amount_minor })),
  processorFees: fees.map((fee) => ({ paymentId: fee.payment_id, amountMinor: fee.amount_minor })),
  estimatorAssignments: Object.fromEntries(assignments.filter((assignment) => assignment.assignment_type === "totalscope_estimator").map((assignment) => [assignment.totalscope_file_id, assignment.user_id])),
  claimHandlerAssignments: Object.fromEntries(assignments.filter((assignment) => assignment.assignment_type === "totalscope_claim_handler").map((assignment) => [assignment.totalscope_file_id, assignment.user_id])),
  disputes: disputes.map((dispute) => ({ amountMinor: dispute.amount_minor })),
};

const configuration = getAnalyticsConfiguration({});
const kpis = evaluateKpis(analyticsInput, configuration);
const result = evaluateOperations(analyticsInput, configuration);
const kpiMap = new Map(kpis.map((kpi) => [kpi.key, kpi]));

export type OperationsFile = ReturnType<typeof operationsFiles>[number];

export function operationKpis(): EvaluatedKpi[] {
  return kpis;
}

export function operationKpi(key: string): EvaluatedKpi {
  const value = kpiMap.get(key);
  if (!value) throw new Error(`Unknown C3 KPI: ${key}`);
  return value;
}

export function operationsFiles() {
  return files.map((file) => {
    const assignment = assignmentsByFile.get(file.totalscope_file_id);
    const initial = facts.find((fact) => fact.totalscope_file_id === file.totalscope_file_id && fact.metric_key === "initial_rcv");
    const final = facts.find((fact) => fact.totalscope_file_id === file.totalscope_file_id && fact.metric_key === "final_rcv");
    const fileInvoices = invoices.filter((invoice) => invoice.totalscope_file_id === file.totalscope_file_id);
    const fileCharges = charges.filter((charge) => fileInvoices.some((invoice) => invoice.invoice_id === charge.invoice_id));
    const capturedCharges = fileCharges.filter((charge) => charge.availability === "captured" && charge.amount_minor !== null && charge.client_billable && !charge.voided);
    return {
      id: file.totalscope_file_id,
      clientId: file.client_id,
      clientName: clientsById.get(file.client_id)?.client_name ?? "Unavailable",
      branchId: file.branch_id,
      branchName: branchesById.get(file.branch_id)?.branch_name ?? "Unavailable",
      serviceType: file.service_type,
      status: file.current_status,
      submittedAt: file.submitted_at,
      completedAt: file.completed_at,
      updatedAt: file.updated_at,
      carrierName: file.carrier_name,
      handlerId: assignment?.user_id ?? null,
      handlerName: assignment ? usersById.get(assignment.user_id)?.display_name ?? "Unavailable" : "Unavailable",
      assignmentType: assignment?.assignment_type ?? null,
      initialRcvMinor: initial?.amount_minor ?? null,
      finalRcvMinor: final?.amount_minor ?? null,
      settlementGainMinor: initial?.amount_minor !== null && initial?.amount_minor !== undefined && final?.amount_minor !== null && final?.amount_minor !== undefined ? final.amount_minor - initial.amount_minor : null,
      approvedChargesMinor: capturedCharges.length ? capturedCharges.reduce((sum, charge) => sum + charge.amount_minor!, 0) : null,
      financialAvailability: file.financial_availability,
      timeline: statuses.filter((status) => status.totalscope_file_id === file.totalscope_file_id),
      notes: notes.filter((note) => note.totalscope_file_id === file.totalscope_file_id),
      documents: documents.filter((document) => document.totalscope_file_id === file.totalscope_file_id),
      lineage: [
        { field: "Current status", source: "TotalScope files.current_status", confidence: "Source provided" },
        { field: "Submitted date", source: "TotalScope files.submitted_at", confidence: file.submitted_at ? "Source provided" : "Unavailable" },
        { field: "Financial facts", source: "TotalScope financial_facts", confidence: file.financial_availability },
      ],
    };
  });
}

export function operationsClients() {
  return clients.map((client) => {
    const clientFiles = operationsFiles().filter((file) => file.clientId === client.client_id);
    const gain = clientFiles.filter((file) => file.settlementGainMinor !== null).reduce((sum, file) => sum + file.settlementGainMinor!, 0);
    const approved = clientFiles.filter((file) => file.approvedChargesMinor !== null).reduce((sum, file) => sum + file.approvedChargesMinor!, 0);
    return {
      id: client.client_id,
      name: client.client_name,
      branches: branches.filter((branch) => branch.client_id === client.client_id),
      files: clientFiles,
      active: clientFiles.filter((file) => !file.completedAt).length,
      completed: clientFiles.filter((file) => file.completedAt).length,
      settlementGainMinor: gain,
      approvedChargesMinor: approved,
      netGainMinor: gain - approved,
      roi: approved === 0 ? null : (gain - approved) / approved,
    };
  });
}

export function operationsHandlers() {
  return result.performance.handlers.map((handler) => {
    const handlerFiles = operationsFiles().filter((file) => file.handlerId === handler.dimensionId);
    const gains = handlerFiles.filter((file) => file.settlementGainMinor !== null).map((file) => file.settlementGainMinor!);
    return {
      id: handler.dimensionId,
      name: usersById.get(handler.dimensionId)?.display_name ?? handler.dimensionId,
      files: handlerFiles,
      active: handlerFiles.filter((file) => !file.completedAt).length,
      completed: handler.completedFiles,
      averageCycleDays: handler.averageDaysToClose,
      medianCycleDays: handler.averageDaysToClose,
      totalSettlementGainMinor: gains.reduce((sum, gain) => sum + gain, 0),
      averageSettlementGainMinor: gains.length ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length : null,
      eligibleForComparison: handler.eligibleForComparison,
      minimumCohort: configuration.minimumComparativeCohortSize,
    };
  });
}

export function operationsDataHealth() {
  return {
    fixtureFingerprint: "459e70530ff64f62aeebebab1e5b3c83cacbcd8d77f8087fd07c9ac5522ab6e3",
    capturedAt: "2026-06-30T23:59:59-04:00",
    imports: [
      { source: "TotalScope historical export", status: "Completed", records: 46, issues: 0 },
      { source: "Stripe periodic export", status: "Completed", records: 21, issues: 0 },
    ],
    financialCoverage: files.filter((file) => file.financial_availability === "captured").length / files.length * 100,
    missingDates: files.filter((file) => !file.submitted_at).length,
    missingFinancial: files.filter((file) => file.financial_availability !== "captured").length,
    unmatchedFinancial: 0,
    ambiguousMappings: 0,
    lowConfidenceMappings: 0,
    duplicateRecords: 0,
    kpiAvailability: kpis.filter((kpi) => kpi.status !== "unavailable").length / kpis.length * 100,
  };
}
