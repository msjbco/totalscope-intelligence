# Weather horizon and forecast-signal semantics

## Intelligence horizon

The 24-hour, 48-hour, 72-hour, and 7-day controls define a shared Weather Intelligence horizon. They filter active/issued NWS alert opportunities and independently derive adverse point-forecast signals whose forecast periods overlap the selected window. They are not map zoom controls.

When the horizon or a composable Weather Opportunity/Event/Geography filter changes, the map fits the complete visible opportunity set. Selecting an individual opportunity remains a separate action and fits that opportunity. A retained selection does not force the old tight map focus after a horizon change.

Active NWS products remain **Active / Issued Weather Opportunities**. Point-forecast results remain **Forecast-derived Weather to Watch** and are never presented as warnings or watches unless an official NWS alert actually exists.

## Forecast signal contract

`forecast_signal_v1` includes only explicit, source-supported restoration-relevant forecast conditions:

- explicit hail;
- damaging/high/extreme wind or a reported forecast wind speed of at least 40 mph;
- explicit severe thunderstorms;
- explicit tornado conditions;
- tropical/hurricane conditions;
- significant flooding/heavy rain;
- significant winter/ice conditions.

Sunny, clear, mostly sunny, and generic non-severe thunderstorm periods are suppressed. The classifier does not infer hail or tornado potential from ordinary thunderstorms. When nothing qualifies, the UI says that no significant upcoming restoration-relevant weather was identified.

## Nationwide and point-forecast roles

Nationwide intelligence comes from official NWS alert geometries; TotalScope does not configure every city or ZIP as a forecast point. Point forecasts are selectively used for monitored strategic markets and can later be requested for important opportunity geometry.

A future dynamic opportunity forecast request should choose a representative point deterministically: use the official Point geometry when present; otherwise prefer a polygon interior point produced by PostGIS (`ST_PointOnSurface`) rather than an unverified city or bounding-box centroid. Cache the result by alert revision, representative grid point, forecast type, and NWS update timestamp. This pass defines that boundary but does not add continuous nationwide point polling.

## Interaction state

Weather Opportunity KPI cards toggle High, Moderate, or Low filtering and compose with horizon, event, geography, and future client-exposure filters. Active Alerts opens the existing official source catalog; it does not equate source-alert count with operational-opportunity count. Last Weather Update remains visually informational.

Filter state remains local component state for now. This preserves the existing authenticated Server Component boundary and avoids prematurely defining a shareable internal URL contract while client and prospect dimensions are unavailable. Query-parameter persistence can be added once the filter vocabulary is stable.
