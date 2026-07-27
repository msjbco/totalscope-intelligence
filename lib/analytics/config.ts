export interface AnalyticsConfiguration {
  minimumComparativeCohortSize: number;
  approachingClaimHandlingBillingDays: number;
  stalledFileDays: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Analytics configuration must be a positive integer; received "${value}"`);
  }
  return parsed;
}

export function getAnalyticsConfiguration(
  environment: Record<string, string | undefined> = process.env,
): AnalyticsConfiguration {
  return {
    minimumComparativeCohortSize: positiveInteger(
      environment.TSI_MINIMUM_COMPARATIVE_COHORT_SIZE,
      10,
    ),
    approachingClaimHandlingBillingDays: positiveInteger(
      environment.TSI_APPROACHING_CH_BILLING_DAYS,
      30,
    ),
    stalledFileDays: positiveInteger(environment.TSI_STALLED_FILE_DAYS, 14),
  };
}
