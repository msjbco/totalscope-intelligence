export const NWS_REFRESH_INTERVAL_MINUTES = 30;
export const NWS_MAX_ATTEMPTS = 3;
export const NWS_REQUEST_TIMEOUT_MS = 15_000;
export const NWS_LEASE_SECONDS = 900;
export const NWS_EXCESSIVE_DURATION_MS = 300_000;

export function retryDelayMs(attemptIndex, retryAfterHeader = null) {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (retryAfterHeader !== null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(retryAfterSeconds * 1000, 10_000);
  }
  return Math.min(1000 * 2 ** attemptIndex, 4000);
}

export function isTransientNwsStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

export function classifyMissingEvent(event, observedAt) {
  return Date.parse(event.expires_at) <= Date.parse(observedAt) ? "expired" : "closed";
}
