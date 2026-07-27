export type Availability =
  | "captured"
  | "not_captured"
  | "partially_captured"
  | "invalid"
  | "not_applicable";

export interface AnalyticsFile {
  id: string;
  clientId: string;
  branchId: string;
  handlerId: string | null;
  carrierName: string | null;
  serviceType: "estimate_only" | "claim_handling";
  status: string;
  submittedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
}

export interface FinancialFact {
  fileId: string;
  metricKey: "initial_rcv" | "final_rcv";
  amountMinor: number | null;
  availability: Availability;
}

export interface InvoiceCharge {
  fileId: string;
  chargeType: string;
  amountMinor: number | null;
  availability: Availability;
  clientBillable: boolean;
  voided: boolean;
}

export interface Payment {
  id: string;
  fileId: string | null;
  amountMinor: number;
  status: string;
}

export interface Refund {
  paymentId: string;
  amountMinor: number;
  status: string;
}

export interface PaymentFailure {
  fileId: string | null;
  amountMinor: number | null;
}

export interface ProcessorFee {
  paymentId: string;
  amountMinor: number;
}

export interface AnalyticsInput {
  asOf: string;
  files: AnalyticsFile[];
  financialFacts: FinancialFact[];
  invoiceCharges: InvoiceCharge[];
  payments: Payment[];
  refunds: Refund[];
  paymentFailures: PaymentFailure[];
  processorFees: ProcessorFee[];
}

export interface MetricResult {
  value: number | null;
  numerator: number | null;
  denominator: number;
  coveragePercent: number;
  status: "measured" | "inferred" | "unavailable";
  explanation: string;
}

export interface PerformanceRow {
  dimensionId: string;
  submittedFiles: number;
  completedFiles: number;
  averageDaysToClose: number | null;
  eligibleForComparison: boolean;
}

export interface AnalyticsResult {
  fileCounts: {
    total: number;
    estimateOnly: number;
    claimHandling: number;
    active: number;
    completed: number;
  };
  revenue: {
    estimate: MetricResult;
    claimHandling: MetricResult;
    fees: MetricResult;
    refunds: MetricResult;
    failedPayments: MetricResult;
  };
  settlement: {
    gains: MetricResult;
    clientNetGain: MetricResult;
    roi: MetricResult;
  };
  cycle: {
    averageDaysOpen: MetricResult;
    averageDaysToClose: MetricResult;
    approachingClaimHandlingBilling: number;
  };
  performance: {
    handlers: PerformanceRow[];
    carriers: PerformanceRow[];
  };
}
