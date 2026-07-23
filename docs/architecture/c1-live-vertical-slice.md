# C1 — Q2 2026 live vertical slice

## Scope and source boundary

C1 introduces a provenance-first Supabase foundation for the audited Q2 2026 Monday archive. Monday is authoritative for the operational and claim-economic facts present in the workbook. Stripe remains the future authority for invoices, charges, payments, refunds, collection dates, balances, processor fees, net proceeds, and settlement availability. A Monday `Client Fee` is therefore labeled operational fee data, never collected revenue.

The source workbook remains under Git-ignored `data/source/`; it is hashed before parsing and again after validation. Its binary is not uploaded by C1. Raw worksheet rows, exact positional headers, staging records, canonical claims, field-level financial facts, immutable updates, derived metrics, and review issues are stored in PostgreSQL.

## Migration and schema

Apply migrations in filename order:

1. `supabase/migrations/202607230001_c1_q2_2026_foundation.sql`

The migration creates provenance, separate hierarchical staging, canonical claims and identities, field-level financial facts, versioned derived metrics, immutable updates, quality issues, a validation view, and the service-role-only transactional `import_q2_2026_archive(jsonb)` RPC.

All tables have RLS enabled. C1 creates no anonymous or authenticated read policy. The service-role key stays server-side. Production authentication is not implemented, so live routes are additionally denied unless `TOTALSCOPE_INTERNAL_ACCESS_ENABLED=true`. Use that switch only in a protected local environment.

## Parser, duplicate headers, and hierarchy

`scripts/q2_2026_import.py` reads the workbook without network access and never saves it. A nonblank `Item ID (auto generated)` identifies claims; `Name = Subitems` identifies repeated headers; remaining primary-sheet rows are subitem details. Positional subitem parentage remains staging-only with limited confidence.

Headers use one-based positions:

- `archive q2 2026`: `CH Update` at columns 8 and 46; column 46 becomes `CH Update__column_46`.
- `updates`: `Content Type` at columns 3 and 4; column 4 becomes `Content Type__column_4`.

Raw header text and disambiguated internal names are stored in worksheet provenance.

## Financial, date, and timezone policy

Blank is `not_captured`; numeric zero is `captured` with value zero. Initial RCV, Requested RCV, Current RCV, Additional Secured, Client Fee, and Percentage Increase remain separate facts. `Current RCV` is not renamed to Final RCV.

`additional-rcv-v1` calculates `Current RCV - Initial RCV`. Source Additional Secured remains a comparison fact. Expected reconciliation is 213 exact matches, no tolerance-only matches, no mismatches, and one missing-component case. The 4,510 Percentage Increase is preserved and reviewed.

Raw date values are retained. Excel dates are date-only. Monday update timestamps parse to naive local timestamps with `unknown_timezone`; they are not silently converted to UTC. `Assigned`, `Closed Date`, `Date of Status Change`, and `CH Update` remain semantically unresolved and are not promoted into authoritative lifecycle timestamps.

## Data modes and review

- `demo`: synthetic fixtures only, visibly labeled **Demo Data**.
- `live`: imported Supabase records only; failures render an error and never substitute demo records.

There is no implicit auto fallback. Supabase access is centralized under `lib/data/`.

The consolidated review queue covers unmatched update IDs, blank bodies, duplicate-body fingerprints, the extreme percentage, missing Initial RCV, duplicate headers, unknown timezone, and unresolved subitems. Exact normalized aliases are promoted conservatively, while raw spellings remain preserved.

## Runbook

Prerequisites: Node 22+, Python with `openpyxl`, Docker, and the Supabase CLI.

```powershell
Copy-Item .env.example .env.local
supabase start
supabase db reset
npm install
$env:TOTALSCOPE_DATA_MODE = "live"
$env:TOTALSCOPE_INTERNAL_ACCESS_ENABLED = "true"
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY = "<local service-role key>"
npm run import:q2-2026
npm run validate:q2-2026-import
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

The importer supports local or hosted Supabase through server-only environment variables. Never expose the service-role key through a `NEXT_PUBLIC_` variable.

### Bounded database execution

The workbook is not submitted as one database statement. The importer executes 81 deterministic calls in dependency order: source rows in batches of 250, claims in batches of 25, subitem headers/details in batches of 100, updates in batches of 250, then one count-gated finalizer. The RPC rejects oversized batches.

Each batch is its own transaction. Unique source, claim, Post ID, fact, metric, alias, staging, and issue keys make a retry safe after a timeout, process interruption, or network failure. A failed batch is rolled back; earlier committed batches remain attached to the same import job and are reused on retry. The importer attempts to mark the job `failed`; if the connection itself is unavailable, `running` indicates an interrupted job. A retry sets the same checksum/importer-version job back to `running` and resumes through conflict-safe upserts.

The finalizer calculates actual database counts and refuses to mark the job complete unless all C1 acceptance counts match. No global database statement timeout is disabled or widened.

## Rerun, rollback, and gaps

A same-checksum/same-importer-version rerun reuses its job and conflict-safe unique keys. A new importer version creates a new job while stable canonical claim and update keys avoid business-record duplication.

For local rollback, run `supabase db reset`, then reimport. In hosted environments, mark a bad job `superseded`, apply a forward migration, and preserve original provenance.

Known gaps: production authentication and authorization; Stripe reconciliation; service/property type; canonical subitems; approved source timezone and ambiguous date semantics; full identity review editing. A database reset/import cannot be executed where no Supabase CLI or endpoint is available.
