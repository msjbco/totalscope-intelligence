export type DataMode = "demo" | "live";
export type ValidationState = "pass" | "warning" | "fail";

export interface LiveMetric {
  key: string;
  label: string;
  value: number | null;
  format: "count" | "currency" | "percent";
  source: string;
  definition: string;
  availability: string;
  calculationVersion: string | null;
  confidence: string;
  validationState: ValidationState;
  kind: "source_provided" | "derived";
}

export interface LiveDashboardSummary {
  mode: DataMode;
  period: "2026-Q2";
  sourceLabel: string;
  collectionSourceLabel: string;
  metrics: LiveMetric[];
}

export interface LiveClaimListItem {
  id: string;
  mondayItemId: string;
  displayName: string | null;
  rawStatus: string | null;
  normalizedStatus: string;
  contractor: string | null;
  carrier: string | null;
  sourceRow: number;
}

export interface LiveClaimDetail extends LiveClaimListItem {
  serviceType: null;
  propertyType: null;
  dates: Record<string, { raw: unknown; parsed: string | null; timezone_status: string }>;
  financialFacts: Array<{
    metric: string; sourceField: string; rawValue: unknown; value: number | null;
    availability: string; sourceColumn: number;
  }>;
  derivedMetrics: Array<{
    metric: string; version: string; value: number | null; sourceValue: number | null;
    reconciliation: string; difference: number | null;
  }>;
  updates: Array<{
    postId: string; timestamp: string | null; rawTimestamp: string | null; timezoneStatus: string;
    author: string | null; body: string | null; blankBody: boolean; duplicateBody: boolean; sourceRow: number;
  }>;
  provenance: {
    worksheet: string; sourceRow: number; sourceSystem: string;
  };
}

export interface ImportValidation {
  mode: DataMode;
  available: boolean;
  error?: string;
  importJob?: {
    id: string; status: string; sourceFilename: string; sourceSha256: string;
    sourcePeriod: string; importerVersion: string; startedAt: string; completedAt: string | null;
    metadata: Record<string, unknown>;
  };
  counts: Record<string, number>;
  expected: Record<string, number>;
  issues: Array<{ issueType: string; severity: string; status: string; count: number }>;
}
