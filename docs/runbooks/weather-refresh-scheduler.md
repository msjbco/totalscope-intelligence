# Governed NWS refresh scheduler

The official NWS active-alert feed is refreshed every 30 minutes. TotalScope Intelligence is operational intelligence, not an emergency-alert delivery system; changing this cadence requires explicit product approval.

## Lifecycle and retention audit

`weather_events` is the durable canonical record and `weather_event_revisions` is immutable. A later active-alert snapshot never deletes an event or revision. Events no longer returned by the active endpoint transition to provider status `Inactive`; the refresh reports whether that transition was caused after the official expiry time (`expired`) or before it (`closed`). Source artifacts, ingestion records, geometry, revisions, opportunities, and historical exposures remain retained.

The current `weather_internal_active_alerts` browser interface intentionally filters to `provider_status = 'Actual'` and an unexpired timestamp. Consequently, the current 24h/48h/72h/7d UI horizons are still horizons over active records, not a full historical-event horizon. The scheduler preserves the facts required for historical intelligence, but broadening that browser interface requires a separate product/security gate.

### Follow-on product gate: Historical Weather Horizons

In a separate approved milestone, the 24h/48h/72h/7d controls should query governed recent Weather events, including appropriate retained expired or inactive events, rather than only currently active and unexpired NWS alerts. That future work must define horizon timing, lifecycle inclusion, authorization, and browser-safe interfaces. This scheduler checkpoint deliberately does not change the existing query contract.

## Mechanism and security

`.github/workflows/weather-refresh-staging.yml` uses `*/30 * * * *`, a staging GitHub environment, and manual dispatch for controlled recovery. It uses only server-side environment secrets. A service-only, expiring PostgreSQL lease is the cross-run lock; GitHub workflow concurrency is a second guard. The lease expires after 15 minutes so an interrupted worker cannot block future runs indefinitely.

The worker sends an explicit monitored-contact `User-Agent`, uses a 15-second request timeout, and retries only transient HTTP failures up to three total attempts with bounded backoff. A failed refresh is recorded and leaves the last successful canonical dataset untouched. Each attempt records status, latency, retry count, and sanitized failure details. Runs exceeding five minutes emit a diagnostic warning and fail the workflow timeout before the lease can expire.

After official geometry is persisted, the worker runs governed Census ZCTA intersection and refreshes client exposure using the existing 50 km rule. Exposure input remains limited by the database function to active/current clients and accepted rooftop, parcel, or interpolated-address coordinates.

The scheduled trigger becomes active only after this workflow is present on GitHub's default branch. Before that merge gate, use `workflow_dispatch` or the controlled local command against isolated staging.

## Forecast decision

Forecasts should remain request-time for this gate. They serve monitored-location page context, have independent failure disclosure, and do not participate in canonical alert lifecycle reconciliation. Scheduling them would introduce a separate persistence, freshness, and monitoring contract and is not required to govern official active alerts.
