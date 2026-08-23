# Weather Intelligence functional architecture

## Governing distinction

Weather Severity represents meteorological seriousness from NWS severity, urgency, and certainty. TotalScope Opportunity represents deterministic relevance to roofing and property-restoration activity. The two scores are never substituted for one another.

TotalScope Opportunity starts with an explicit normalized-event base: Tornado 92, Tropical/Hurricane 88, Hail 85, Damaging/Extreme Wind 80, Severe Convective 65, Winter/Ice 45, Flooding 28, and Other 12. Small documented additions apply only for explicit source evidence: hail presence/size, damaging wind/wind value, observed certainty, and immediate urgency. Scores are capped at 100. Exact NWS products remain provenance. A thunderstorm is not Hail unless its source explicitly supports hail.

## ZCTA architecture

Affected ZIP display will use server-side PostGIS intersection against the current U.S. Census TIGER/Line ZCTA release in EPSG:4326, with indexed geometry transformed consistently before `ST_Intersects`. Census ZCTAs approximate ZIP delivery areas; they are not USPS ZIP Codes, and the UI says so. The browser receives sorted five-digit results plus methodology—not nationwide polygons.

The future loader records source URL, Census vintage, checksum, retrieval time, row counts, CRS, and import run. A new vintage loads side-by-side, is validated and indexed, then activates atomically. Simplification is allowed for display only; intersection uses authoritative geometry. This pass supplies deterministic intersection logic and explicit unavailability but does not load national ZCTA data or change the database.

## Client geography readiness

The forthcoming authoritative export flows through validation, normalization, canonical identity matching, address geocoding, governed coordinates, and exposure analysis. Repeated exports reconcile/upsert rather than append duplicate companies. Deterministic IDs, exact address-plus-ZIP, normalized phone, and reviewed external IDs may confirm a match. Name-only matches remain possible and require review; fuzzy merge is never automatic.

Location precision remains exact geocoded street, ZIP-level, city-level, or unknown. Exposure is direct/inside geometry, near, outside, or unknown. Approximate coordinates are never represented as exact. Until the export is audited, client exposures remain intentionally empty.

## Contractor discovery readiness

`ContractorDiscoveryProvider` and `ContractorProspect` remain provider-neutral. Default radius is 50 km and configurable. Distance is measured to the nearest relevant event boundary rather than its centroid. Provider identity, business ID, available contact fields, retrieval timestamps, and match status stay traceable; missing contact information stays missing.

Existing-client comparison supports `not_existing_client`, `possible_existing_client`, and `confirmed_existing_client`. Confirmed matches will be excluded; possible matches stay visible for review. Activation remains blocked on a separately approved licensed provider and the authoritative client dataset.
