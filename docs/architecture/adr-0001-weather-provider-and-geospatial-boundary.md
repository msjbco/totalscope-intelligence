# ADR-0001: Weather provider and geospatial boundary

**Status:** Accepted for internal beta
**Date:** August 10, 2026

## Decision

Use an internal `WeatherProvider` interface with an NWS implementation, canonical WGS 84 GeoJSON contracts, and PostGIS geography persistence. Use a separate `ContractorDiscoveryProvider` interface and leave it explicitly unconfigured until TotalScope approves a licensed business-data provider.

NWS requests execute only on the server. UI code consumes a provider-independent application snapshot. Live mode never imports demo adapters. Weather and prospect browser access is limited to `staging_admin`.

## Why

NWS is an authoritative, open, cache-friendly source for U.S. forecasts and official alerts. It does not provide contractor businesses, so combining those concerns would create vendor coupling and unclear licensing. PostGIS provides defensible polygon intersection and nearest-boundary distance without shipping a large browser geospatial engine. The internal-only boundary isolates the current application tenant-authorization P0.

## Consequences

- A monitored contact is required in `NWS_USER_AGENT`.
- A future provider can be additive without rewriting the UI.
- Contractor results remain unavailable—not mocked—in live mode until licensing and credentials are approved.
- The UI may degrade to lists when mapping credentials or polygon rendering are unavailable.
- External customer access is a later security milestone, not an implication of this beta.
