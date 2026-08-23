# Weather Intelligence Beta Architecture

Weather Intelligence Beta is a TotalScope-internal decision-support surface. It is not a consumer weather application and is not available to ordinary `viewer` or future client roles.

## Boundaries

```text
Official provider -> typed provider adapter -> canonical weather contracts
                  -> refresh/cache boundary -> deterministic classification
                  -> internal server service -> staging_admin UI

Licensed business provider -> contractor adapter -> canonical prospects
                           -> client matching -> 50 km geometry evaluation
                           -> internal server service -> staging_admin UI
```

React components never parse vendor payloads or possess provider secrets. `NWSWeatherProvider` owns official API requests and normalization. `ContractorDiscoveryProvider` is vendor-neutral; until a licensed provider is selected and configured, live mode returns an explicit `not_configured` state and zero prospects.

Demo mode may use the isolated synthetic map. Live mode calls only `getLiveWeatherIntelligence`; tests prohibit imports of demo data or fixtures into that path. Provider, configuration, or data failures remain visible and never trigger a plausible synthetic fallback.

## NWS integration

The initial provider uses official `api.weather.gov` active-alert and point/grid forecast endpoints. Requests are server-only, identify the application through `NWS_USER_AGENT`, time out after eight seconds, retry transient failures at most twice with exponential backoff, and use separate cache cadences: two minutes for alerts and fifteen minutes for forecasts. The NWS asks alert consumers not to request more often than every 30 seconds; these defaults remain above that floor.

The provider validates required fields at the boundary and preserves provider ID, source URL, source timestamp, retrieval timestamp, alert timing, severity/certainty/urgency and GeoJSON. Unsupported precision is never inferred. Official references: [NWS API Web Service](https://www.weather.gov/documentation/services-web-api) and [NWS Alerts Web Service](https://www.weather.gov/documentation/services-web-alerts).

## Classification

`classifyAlert` is deterministic and versionable:

- irrelevant alerts are excluded;
- `active`: immediate urgency or extreme severity;
- `high`: severe plus observed/likely certainty;
- `elevated`: severe or expected;
- `monitor`: other restoration-relevant official products.

An alert or opportunity never asserts actual property damage.

Related alerts are converted into operational groups by the deterministic rules in [ADR-0002](adr-0002-weather-opportunity-map.md). The grouping retains every official source alert and never uses opaque or probabilistic clustering.

## Geometry and distance

Canonical geometry uses GeoJSON/WGS 84 (`EPSG:4326`). Persistence also stores PostGIS geography for indexed intersection and nearest-boundary calculations. The dependency-free domain helper uses Haversine kilometers and nearest supplied geometry vertex as a conservative local calculation. Production prospect selection must use PostGIS nearest-boundary distance for polygons; centroid-only distance is permitted only when the provider supplies only a point.

The default prospect radius is 50 km and is stored with each evaluated relationship. It must be centralized in provider/application configuration before a contractor provider is enabled.

## Ownership and security

- live `/weather` requires `staging_admin` at the server layout;
- all new tables enable RLS and browser mutation is revoked;
- weather, exposure, prospect, sales and provider-health rows use `private.is_staging_admin()` policies;
- raw normalized revisions and source ledger data remain service-role-only;
- service-role credentials are never used by application components;
- `weather_client_exposures` proves `(branch_id, client_id)` ownership with a composite foreign key;
- possible client matches are retained for review; confirmed client matches are excluded from the default prospect presentation.

This intentionally isolates the commercial tenant P0 rather than pretending the application-wide tenant model is solved. External access requires a membership model and tenant predicates across all canonical surfaces.

## Freshness and failure

Provider state includes last attempt, last success, stale status and sanitized error state. Live UI always shows source and freshness. NWS and contractor failures are independent; one cannot crash or fabricate the other. Structured provider logs include provider, operation, result, latency and retry count, never secrets or full credential-bearing URLs.

## Retention and persistence

The migration stores canonical events, immutable revisions, bounded forecast snapshots, refresh health, classifications, exposures, contractor observations and storm/prospect relationships. Raw source payloads remain in the existing restricted ingestion ledger. Third-party prospect payload retention must be reviewed against the eventual provider license before enablement.

## Configuration

- `TOTALSCOPE_DATA_MODE=live`
- `TOTALSCOPE_DEPLOYMENT_ENV=local|staging`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NWS_USER_AGENT="TotalScope Intelligence weather-beta (operations-contact@example.com)"`
- `WEATHER_MONITORED_LOCATIONS_JSON` — JSON array of `{id,name,latitude,longitude,state?}`, maximum 25

No contractor credential is currently defined because no provider has been selected. Do not invent one or use consumer-site scraping.

## Validation

`npm test`, `npm run test:weather`, typecheck, lint and build run in the PR workflow. A separate CI job starts local Supabase, applies every migration, and runs the Weather database authorization probe. The older C2/C3 database probes require imported datasets that are intentionally unavailable to CI (the Q2 workbook is ignored); their static security tests remain in `npm test` and their database probes remain mandatory at milestone acceptance after controlled fixture/archive imports. If the CI database job cannot start its infrastructure, the workflow fails; it is not silently marked green.

Local database validation requires Docker and Supabase CLI:

```powershell
npx --yes supabase@latest start --agent no
npx --yes supabase@latest db reset --local --agent no
# load local API values from `supabase status -o env` without printing them
npm run test:c2-db
npm run test:c3-db
npm run test:weather-db
```

## Current limitations

- no licensed contractor-discovery provider is selected;
- client/branch coordinates require a governed master-data load;
- no scheduler or hosted refresh has been approved;
- the internal beta renders source-provided NWS polygons over a local U.S. state context; no street-level or commercial tile provider is configured;
- PostGIS persistence exists, but this local slice retrieves NWS through the server cache until an administrative refresh runner is approved;
- external/client access remains blocked pending application-wide tenant authorization.
