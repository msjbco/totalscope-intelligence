# TotalScope Intelligence

TotalScope Intelligence is a Next.js 15 restoration-estimating and property-claim intelligence platform under active development. It combines executive metrics, claim-file exploration, operational throughput, carrier and contractor performance, and an internal Weather Intelligence Beta.

## Demo-data warning

**Every source-controlled record and automated-test fixture in this repository is synthetic Demo Data.** Real operational exports must remain outside Git and may enter only through a controlled, service-role importer. Missing financial data is retained with one of five explicit statuses and is never converted to zero:

- `captured`
- `not_captured`
- `partially_captured`
- `invalid`
- `not_applicable`

The dataset in `lib/demo-data.ts` deterministically produces nine source quarters of claims plus contractors, carriers, adjusters, state and ZIP geography, service and file statuses, dates, financial fields, updates, synthetic weather events, and claim-to-weather matches.

## Architecture

Weather Intelligence geographic governance and versioned scoring are documented in [docs/architecture/weather-zcta-and-scoring.md](docs/architecture/weather-zcta-and-scoring.md). Census ZCTA geometry stays in PostGIS; browser payloads contain only affected identifiers.

- `app/` owns App Router route composition and metadata.
- `components/dashboard/` contains the shared responsive shell, global filter context, Claims Explorer, and domain-specific analytical views.
- `components/ui/` contains reusable KPI, metric-metadata, chart, status, and section primitives.
- `lib/demo-data.ts` is the centralized typed synthetic source.
- `lib/filters.ts` applies global quarter, date, contractor, carrier, state, and service filters.
- `lib/calculations.ts` contains framework-independent metric services.
- `lib/observations.ts` produces deterministic, threshold-based observations without an AI service.
- `types/` defines domain, filter, metric, confidence, and financial-status contracts.
- `hooks/`, `public/`, and `styles/` provide extension points for shared behavior and assets.

The executive, operations, weather, carrier, contractor, claims, and reporting views compose their own domain-specific content while sharing navigation, filter state, and UI primitives.

## Calculation architecture

Calculation services receive claim arrays and return values with metric metadata:

- numerator and denominator;
- data-coverage percentage;
- confidence grade;
- measured, inferred, or unavailable status;
- plain-language explanation;
- optional drill-down filters.

Financial calculations include only records with usable financial status. Cycle-time calculations include only records with qualifying dates. This keeps absence distinct from a measured zero.

Deterministic observations cover claim-volume change, average-recovery change, cycle-time deterioration, carrier concentration, low financial coverage, stalled files, aging risk, geographic expansion, and synthetic weather opportunity.

## Run and validate

```bash
npm install
npm test
npm run dev
npm run typecheck
npm run lint
npm run build
```

Local demo startup requires explicit boundaries:

```powershell
$env:TOTALSCOPE_DATA_MODE="demo"
$env:TOTALSCOPE_DEPLOYMENT_ENV="local"
npm run dev
```

The application remains Netlify compatible and C2 also documents a separate Vercel staging deployment.

## Architecture documentation

The Phase B canonical data, lifecycle, permission, provenance, financial, Stripe reconciliation, KPI, quality, and implementation blueprint is indexed in [docs/architecture/README.md](docs/architecture/README.md). This package is documentation only and does not add a production schema, credentials, authentication, or runtime integration.

Observed-source audits and import-readiness findings are indexed in [docs/audits/README.md](docs/audits/README.md).

### C1 live Q2 2026 vertical slice

The application now supports explicit `demo` and `live` data modes. Demo mode uses visibly labeled synthetic fixtures. Live mode reads the canonical Supabase schema populated from the Git-ignored Q2 2026 Monday archive; live failures never substitute demo records.

See [C1 Q2 2026 Live Vertical Slice](docs/architecture/c1-live-vertical-slice.md) for schema, importer, validation, environment, provenance, RLS, rerun/rollback, and Stripe-boundary details.

```bash
npm run validate:q2-2026-import
```

### C2 authenticated staging foundation

C2 adds Supabase email/password authentication, cookie-backed server sessions, `viewer` and `staging_admin` roles, defense-in-depth route guards, browser-safe column grants with RLS, an explicit import-target confirmation, and a coarse `/api/health` endpoint. Browser-facing reads use the anon key plus the authenticated user JWT; service-role access remains importer-only.

See [C2 staging security architecture](docs/architecture/c2-staging-security.md) and the [staging deployment runbook](docs/runbooks/c2-staging-deployment.md). Staging and production-like builds fail when explicit live configuration is incomplete. No open signup is provided.

## Known production gaps

- Email/password authentication is staging-ready; Enterprise SSO, MFA policy, and production authentication rollout are not implemented.
- Demo mode is in-memory, synthetic, and explicit. Live mode requires both migrations, the Q2 import, public Supabase project values, and an authenticated account.
- Weather remains synthetic only in explicit demo mode. Live Weather Intelligence retrieves official NWS alerts and configured point forecasts server-side, is restricted to `staging_admin`, and never falls back to fixtures. Scheduled refresh execution, operational monitoring, and a licensed contractor-discovery provider remain separate approval gates before operational rollout.
- Exports, scheduled reports, alerts, settings persistence, integrations, and notifications are disabled placeholders.
- Billing, production monitoring, audit logging, and data-governance controls are not implemented.
- The demonstration does not include an AI chatbot or AI-generated business conclusions.

### Internal Weather Intelligence Beta

The live `/weather` route is TotalScope-internal only. Configure `NWS_USER_AGENT` and optional `WEATHER_MONITORED_LOCATIONS_JSON` as described in [Weather Intelligence architecture](docs/architecture/weather-data-foundation.md). Missing live configuration produces a visible unavailable state; it never produces fixture weather, prospects, or client exposure. The migration and CI database probe enforce admin-only RLS and composite client/branch ownership for new exposure records.

### Governed company/client master import

The company-export importer reconciles stable `entity_id` identities into the existing C3 client model and uses `(entity_id,address_id)` for locations. It retains immutable source provenance, review issues, field lineage, and created/updated/unchanged reconciliation totals. Real master rows and Weather client geography are restricted to `staging_admin`; contact relationships and raw ingestion data remain service-role-only.

Audit a source without importing it:

```powershell
node scripts/client-data/audit-company-export.mjs "C:\secure\path\all-companies.csv"
node scripts/client-data/import-company-export.mjs inspect --source "C:\secure\path\all-companies.csv"
```

An import additionally requires explicit local/staging target confirmation, server-only Supabase credentials, and an approved `TOTALSCOPE_CLIENT_STATUS_MAPPING_JSON`. Do not run it during deployment. See [the aggregate import-readiness checkpoint](docs/audits/totalscope-company-export-readiness.md) before authorizing any hosted operation.
