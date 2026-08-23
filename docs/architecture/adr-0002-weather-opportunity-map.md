# ADR-0002: Weather opportunity aggregation and map rendering

**Status:** Accepted for internal beta
**Date:** August 11, 2026

## Decision

Present official NWS alerts through deterministic operational-opportunity groups before exposing the underlying alert catalog. Render operational geography as inspectable SVG paths behind `WeatherIntelligenceMap`, using locally packaged WGS84 U.S. state GeoJSON and source-provided NWS GeoJSON. Do not configure a commercial basemap or tile provider during this milestone.

The SVG renderer replaced the initial WebGL-only implementation after the authenticated Preview proved that its presentation surface could initialize and load MapLibre sources while still compositing the canvas as blank. The state asset is a display-simplified WGS84 export from the official [U.S. Census Bureau TIGERweb States service](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/0). It needs no browser credential and supports map-only wheel/pinch zoom, pan, opportunity focus, and national reset.

## Deterministic aggregation and priority

Alerts may group only when normalized event category, time window, and geography are related. Every exact NWS source event and geometry remains attached. Default priority is the deterministic TotalScope Opportunity score; Weather Severity is separately calculated and displayed. Neither score claims property damage.

## Security and data boundaries

- Rendering uses only the authenticated internal snapshot; NWS requests remain server-side.
- No service-role or provider credential enters the browser.
- Client markers remain absent until governed client geography is imported and approved.
- Contractor markers remain absent until a licensed provider is selected and configured.
- The default future contractor relationship radius is 50 km.

## Consequences

Selection stays synchronized between map, list, and detail. Missing geometry remains explicit and never receives a fabricated coordinate. Roads, addresses, satellite imagery, and detailed basemaps require a separate licensed-provider decision.
