# Weather ZCTA geography and opportunity scoring

## Governed source

The governed reference is the U.S. Census Bureau **2025 TIGER/Line national 2020 Census 5-digit ZIP Code Tabulation Area shapefile**, `tl_2025_us_zcta520.zip`. Its boundaries are current as of January 1, 2025; Census released the vintage on September 23, 2025.

- Source: `https://www2.census.gov/geo/tiger/TIGER2025/ZCTA520/tl_2025_us_zcta520.zip`
- Source coordinate system: NAD83 geographic coordinates (EPSG:4269), per the TIGER/Line technical documentation
- Storage coordinate system: WGS84 longitude/latitude (EPSG:4326), transformed by PostGIS during ingestion
- Distribution: U.S. Census Bureau public-domain government geography, available without a commercial data license; attribution remains in provenance
- Update policy: evaluate each annual TIGER/Line release, import it as a new immutable version, validate its fingerprint and record count, and atomically activate it. The prior complete version becomes `superseded` only after the new count gate passes.

ZCTAs approximate ZIP delivery areas but are not USPS ZIP Codes. User-facing copy says “Affected ZIP Codes” for operational clarity and explains that results use Census ZCTAs.

## Data and ingestion architecture

`zcta_dataset_versions` records source identity, URL, SHA-256, source/storage CRS, expected and imported counts, lifecycle status, and import timestamp. `zcta_geographies` stores one validated MultiPolygon per `(dataset_version, zcta5)` with land/water area metadata and a GiST index.

Run `npm run import:census-zctas` with local `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The utility:

1. downloads the official archive only when absent;
2. extracts the archive and streams its shapefile records without loading the national dataset into memory;
3. fingerprints the original archive and counts every converted feature;
4. sends bounded 40-feature RPC batches; PostGIS transforms EPSG:4269 geometry to EPSG:4326;
5. upserts by `(dataset_version, zcta5)`, making retry and interruption safe;
6. activates a version only after its exact record-count gate succeeds.

Source archives and converted files remain under ignored `data/source/census-zcta/`. Repeating the same import is idempotent. Reusing a version with a different SHA-256 fails closed.

## Intersection methodology

The server sends alert IDs and official Polygon/MultiPolygon geometry to the administrator-only `get_weather_affected_zctas` RPC. PostGIS applies bounding-box/GiST filtering, exact `ST_Intersects`, and a material-overlap rule. An intersection qualifies only when its geodesic area is at least the greater of:

- 10,000 square metres; or
- 0.01% of the ZCTA polygon area.

This removes zero-area boundary touches and microscopic slivers while retaining small but operationally material overlaps. Thresholds are explicit RPC parameters so future evidence can refine them without an opaque model. Invalid/missing storm geometry returns an explicit unavailable state. Results are deduplicated and sorted lexicographically. Only identifiers and methodology reach the application; nationwide ZCTA geometry never reaches the browser.

## Weather Opportunity scoring

The current score is named **Weather Opportunity**, not TotalScope Opportunity. It ranks source-supported restoration relevance using `weather_opportunity_v1`. Weather Severity remains a separate meteorological score.

The deterministic breakdown contains:

- normalized event-family base relevance;
- explicit hail and source-reported hail-size adjustments;
- explicit damaging-wind and source-reported wind-speed adjustments;
- exceptional source terms such as Tornado Emergency or major tropical intensity;
- NWS certainty and urgency adjustments.

Routine relevant alerts retain useful headroom. A typical observed/immediate severe-thunderstorm warning with explicit hail and 60 mph wind scores about 81 rather than 100. Large hail, destructive 100+ mph wind, tornado emergencies, or source-supported exceptional combinations can reach the high 90s or the practical ceiling. Each component, points value, source category, rationale, and model version is retained for “Why this ranks here” inspection.

The future composite contract is deliberately unpopulated:

`Weather Opportunity + Client Exposure + Prospect Market Opportunity = TotalScope Opportunity`

Client and prospect inputs remain `null`; no weights or fictional composite score are exposed until governed data exists.

## Display and source boundaries

Affected areas are grouped into human-friendly county/state phrases only when every source token parses confidently. Otherwise the original official wording is preserved. ZCTAs display five identifiers initially, a deterministic `+N more`, and an accessible Show all/Collapse control.

Existing TotalScope Clients remains pending the approved current client-location import. Potential Contractors remains pending provider selection and credentials. Neither surface fabricates results.

## Security and performance

Both ZCTA tables have RLS enabled and no browser grants. Import is service-role-only. Intersection is restricted to `staging_admin`, executes server-side, and returns no geometry. Existing Weather authorization remains unchanged.

The 2025 source archive is approximately 505 MB compressed. PostGIS storage will be larger and should be measured after local import. The GiST index, bounding-box prefilter, material-area rule, one batched RPC per Weather refresh, and identifier-only response bound runtime and browser payload. Cache opportunities include keying results by source alert revision SHA plus active ZCTA dataset version; caching is intentionally deferred until query timings are measured with the complete local dataset.
