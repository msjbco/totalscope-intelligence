# C2.1 Hosted Staging — Pre-Import Baseline

## 1. Purpose

This document records the known-good, read-only state of the isolated TotalScope Intelligence hosted staging environment immediately before the first Q2 2026 workbook import. It is a comparison point for the future post-import and idempotency evidence. No workbook was opened or imported while capturing this baseline.

## 2. Capture Metadata

| Field | Observed value |
|---|---|
| Capture time | 2026-07-23 21:54:33 EDT (`UTC-04:00`) |
| Hosted health-check time | 2026-07-24 01:53:10 UTC |
| Repository branch | `feature/c2-staging-foundation` |
| Repository HEAD | `f2b66e71d5a7c67e120392c9f1078e02afa32f86` |
| Local/remote synchronization | Passed — local HEAD, `origin/feature/c2-staging-foundation`, and a fresh `git ls-remote` result matched |
| Supabase CLI | `2.109.1` |
| Linked project reference | `ygeahqczlrwaadvlsiew` |
| Project name | `totalscope-intelligence-staging` |
| Organization | `TotalScope Intelligence Staging` |
| Region | East US (North Virginia), `us-east-1` |
| Tier / compute | Free / nano |
| Project health | Healthy |
| Environment classification | Permanent isolated staging; not production |

The linked local project reference matched the hosted project. No connection string, database password, access token, API key, or service-role credential was captured.

## 3. Migration Baseline

The Supabase CLI and `supabase_migrations.schema_migrations` both reported exactly two applied migrations in the expected order.

| Order | Version | Hosted name | Local filename | Locally verified SHA-256 | Result |
|---:|---|---|---|---|---|
| 1 | `202607230001` | `c1_q2_2026_foundation` | `202607230001_c1_q2_2026_foundation.sql` | `5430cd056649e56a0e69e5abeac97c8241acd9ffe459cc80dcf9b933e59a372d` | Pass |
| 2 | `202607230002` | `c2_staging_security` | `202607230002_c2_staging_security.sql` | `5bd1f58469ff24608dee95161a936bdfd7c5fb440b9b905ac3c8511163ee02e8` | Pass |

Observed drift status: none. There were no unexpected hosted versions, duplicate versions, ordering gaps, or repair entries. The local and hosted migration histories matched one-to-one.

## 4. Schema Baseline

### Object counts

| Object | Expected | Observed | Result |
|---|---:|---:|---|
| Required extensions | 1 | 1 | Pass |
| Public application tables | 17 | 17 | Pass |
| Public views | 1 | 1 | Pass |
| Application functions/RPCs in `public` and `private` | 8 | 8 | Pass |
| Application triggers in `public` and `auth` | 3 | 3 | Pass |
| Explicit non-constraint indexes | 7 | 7 | Pass |
| RLS-enabled public tables | 17 | 17 | Pass |
| Forced-RLS public tables | 1 | 1 | Pass |
| Public RLS policies | 11 | 11 | Pass |

### Important observed objects

- Required extension: `extensions.pgcrypto`.
- Public tables: `application_profiles`, `claim_derived_metrics`, `claim_financial_facts`, `claim_updates`, `claims`, `data_quality_issues`, `import_jobs`, `organization_aliases`, `organizations`, `people`, `person_aliases`, `source_files`, `source_rows`, `source_worksheets`, `staged_claim_rows`, `staged_subitem_details`, and `staged_subitem_headers`.
- View: `public.q2_2026_import_validation`; `security_invoker=true` was observed.
- Functions/RPCs:
  - `private.is_active_application_user()`
  - `private.is_staging_admin()`
  - `public.create_application_profile()`
  - `public.import_q2_2026_archive(jsonb)`
  - `public.mark_q2_2026_import_failed(text,text,text)`
  - `public.prevent_immutable_source_mutation()`
  - `public.rls_auto_enable()`
  - `public.totalscope_health()`
- The importer RPC contains the count-gated batch/finalization behavior; the failure-marking RPC also exists.
- Triggers:
  - `auth.users:create_application_profile_after_auth_user`
  - `public.claim_updates:claim_updates_immutable`
  - `public.source_rows:source_rows_immutable`
- Explicit indexes:
  - `claim_updates_claim_timestamp_idx`
  - `claim_updates_unmatched_idx`
  - `claims_carrier_idx`
  - `claims_contractor_idx`
  - `claims_status_idx`
  - `data_quality_issues_queue_idx`
  - `source_rows_item_idx`
- The `public.application_role` enum, `public.application_profiles`, administrator-check function, health function, validation view, importer RPC, and failure RPC all exist.

All 17 public tables have RLS enabled. `application_profiles` additionally has forced RLS.

### RLS policies

| Table | Policy | Command | Role |
|---|---|---|---|
| `application_profiles` | `users read own active profile` | SELECT | `authenticated` |
| `claim_derived_metrics` | `active users read claim derived metrics` | SELECT | `authenticated` |
| `claim_financial_facts` | `active users read claim financial facts` | SELECT | `authenticated` |
| `claim_updates` | `active users read matched claim updates` | SELECT | `authenticated` |
| `claims` | `active users read claims` | SELECT | `authenticated` |
| `data_quality_issues` | `staging admins read quality issues` | SELECT | `authenticated` |
| `import_jobs` | `staging admins read import jobs` | SELECT | `authenticated` |
| `organizations` | `active users read organizations` | SELECT | `authenticated` |
| `source_rows` | `active users read sanitized source row coordinates` | SELECT | `authenticated` |
| `staged_subitem_details` | `staging admins validate subitems` | SELECT | `authenticated` |
| `staged_subitem_headers` | `staging admins validate claims` | SELECT | `authenticated` |

### Grant baseline

Observed catalog checks showed:

- `authenticated` may select approved claim columns, but cannot select `source_rows.raw_row`.
- `authenticated` cannot update `application_profiles`.
- `authenticated` cannot execute `import_q2_2026_archive(jsonb)`.
- `anon` cannot select protected `claims` data.
- `anon` can execute `totalscope_health()`.
- `service_role` can update `application_profiles` and execute the importer.

These are observed privilege results, not inferred expectations.

## 5. Authentication and Role Baseline

### Auth configuration

- Email/password authentication: enabled.
- Public self-registration: disabled.
- Anonymous sign-ins: disabled.
- Email confirmation: required for ordinary signups; the two administrator-created staging accounts are confirmed.
- Social and third-party providers: disabled.
- Minimum password length: 12 characters.
- Password composition: lowercase, uppercase, digits, and symbols required.
- Secure password-change checks and current-password verification: enabled.
- Leaked-password screening: unavailable on the Free tier.
- Site URL: safe localhost value (`http://localhost:3000`).
- Redirect allowlist: empty.
- Refresh-token replay protection: enabled with the recommended 10-second reuse interval.

The final Supabase Site URL and staging redirect URL remain deferred until the stable Vercel staging URL exists. No production URL, custom domain, or DNS setting has been introduced.

### Identity counts

| Identity measure | Expected | Observed | Result |
|---|---:|---:|---|
| Auth users | 2 | 2 | Pass |
| Application profiles | 2 | 2 | Pass |
| Active `staging_admin` profiles | 1 | 1 | Pass |
| Active `viewer` profiles | 1 | 1 | Pass |
| Auth users without a profile | 0 | 0 | Pass |
| Orphaned profiles | 0 | 0 | Pass |
| Duplicate profile keys | 0 | 0 | Pass |

| Masked identity | Role | Active | Profile links | Status |
|---|---|---:|---:|---|
| `ms***@gmail.com` | `staging_admin` | Yes | 1 | Permanent staging administrator |
| `mi***@totalscope.com` | `viewer` | Yes | 1 | Temporary acceptance-test viewer; delete after hosted acceptance |

No full email address, user UUID, or password is recorded here.

## 6. Security Boundary Baseline

| Boundary | Observed check | Result |
|---|---|---|
| Anonymous | Protected `claims` table privilege unavailable | Pass |
| Anonymous | Raw and canonical claim data unavailable | Pass |
| Anonymous | `totalscope_health()` executable and returned `true` while impersonating `anon` | Pass |
| Viewer | Approved claim-surface query executed successfully and returned zero rows because the tables are empty | Pass |
| Viewer | Exactly one own active profile was visible | Pass |
| Viewer | Administrator predicate returned `false`; administrator-only validation rows were not visible | Pass |
| Viewer | `source_rows.raw_row` column privilege denied | Pass |
| Viewer | `application_profiles` update privilege denied | Pass |
| Viewer | Self-elevation unavailable through ordinary authenticated permissions | Pass |
| Viewer | Importer RPC execution privilege denied | Pass |
| Staging administrator | One active administrator profile exists | Pass |
| Staging administrator | Administrator predicate returned `true`; validation view query executed successfully | Pass |
| Staging administrator | Ordinary authenticated profile mutation remains denied | Pass |
| Staging administrator | Raw source payload remains restricted by column grants | Pass |
| Staging administrator | Importer remains outside normal browser-user permissions | Pass |
| Service role | Controlled profile update privilege exists | Pass |
| Service role | Importer execution privilege exists | Pass |
| Service role | Credential remains server/importer-only and was not exposed during capture | Pass |

Role probes used transaction-local impersonation and read-only queries. Each transaction was rolled back. No policy or grant was weakened to perform a check.

## 7. Pre-Import Data Counts

Every C1 business, staging, import, provenance, validation, and quality table was queried directly. `application_profiles` is intentionally excluded from the zero-data expectation because it contains the two approved Auth mappings documented above.

| Table | Expected pre-import count | Observed count | Result |
|---|---:|---:|---|
| `claim_derived_metrics` | 0 | 0 | Pass |
| `claim_financial_facts` | 0 | 0 | Pass |
| `claim_updates` | 0 | 0 | Pass |
| `claims` | 0 | 0 | Pass |
| `data_quality_issues` | 0 | 0 | Pass |
| `import_jobs` | 0 | 0 | Pass |
| `organization_aliases` | 0 | 0 | Pass |
| `organizations` | 0 | 0 | Pass |
| `people` | 0 | 0 | Pass |
| `person_aliases` | 0 | 0 | Pass |
| `source_files` | 0 | 0 | Pass |
| `source_rows` | 0 | 0 | Pass |
| `source_worksheets` | 0 | 0 | Pass |
| `staged_claim_rows` | 0 | 0 | Pass |
| `staged_subitem_details` | 0 | 0 | Pass |
| `staged_subitem_headers` | 0 | 0 | Pass |

Observed zero-data result: passed. No workbook content has entered the hosted project.

## 8. Health Baseline

| Captured at | Surface | Observed result | Anonymous callable | Result |
|---|---|---:|---:|---|
| 2026-07-24 01:53:10 UTC | `public.totalscope_health()` | `true` | Yes | Pass |

The function was also called under transaction-local `anon` impersonation and returned `true`. The check exposes no database details or credentials.

## 9. Known Approved Risks

- Five high-severity npm audit package paths remain open:
  - direct `next@15.5.21`, aggregating affected bundled `postcss` and optional `sharp` paths;
  - transitive `postcss@8.4.31` through Next;
  - transitive/optional `sharp@0.34.5` through Next;
  - transitive development `js-yaml@4.1.1` through ESLint configuration;
  - transitive development `brace-expansion@1.1.14` through ESLint/minimatch.
- The project remains classified as **Ready with documented risk**.
- No automatic `npm audit fix` was applied. Advisory remediation remains a production-readiness gate.
- `validateApplicationEnvironment()` lacks a repository-wide invocation point.
- The final Supabase Site URL and redirect configuration are deferred until the stable Vercel staging URL exists.
- The importer-authoritative workbook filename includes ` (1)`, while the older staging deployment runbook omits it.

These risks are recorded without remediation because this task is evidence-only.

## 10. Baseline Conclusion

**Pre-import baseline passed**

The observed hosted state matches the approved expected state: the correct isolated staging project is healthy, exactly two verified migrations are applied, schema and security objects are intact, identities and roles are correctly mapped, all 16 pre-import business/import tables are empty, and the coarse anonymous health function works.

The hosted Q2 import may proceed only through a separate approval gate.

## 11. Next Approval Gate

The next separately approved action would be:

**prepare and execute the first hosted Q2 workbook import, validate canonical counts, run the same import a second time, and confirm idempotency without creating Vercel resources or deploying the application.**

No import is authorized by this baseline.
