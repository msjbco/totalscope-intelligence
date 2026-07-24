# C2 Staging Foundation — Completion Report

## 1. Executive Summary

C2 moved TotalScope Intelligence from the C1 local data vertical slice to a secure, deployment-ready staging foundation. It added Supabase email/password authentication, persistent server-rendered sessions, application roles, database-enforced read boundaries, protected routes, safe live-data repositories, an explicit import-target safeguard, and a coarse health endpoint.

Compared with C1, an authorized user can now sign in, view the live Q2 dashboard, use Claims Explorer, open claim details, refresh without losing the session, and sign out. A `viewer` is denied access to import validation; a `staging_admin` can read that controlled validation surface. Explicit local demo mode remains available and uses synthetic data without Supabase.

All hosted work remains unperformed: no hosted Supabase staging project or Vercel staging project was created or deployed during C2. This milestone is important because it establishes defense-in-depth authentication and authorization without changing the validated C1 import model, counts, or source workbook.

## 2. Milestone Identification

| Item | Value |
|---|---|
| Repository | `msjbco/totalscope-intelligence` |
| Local repository | `C:\Users\msjbc\Documents\TotalScope-Intelligence 2` |
| Branch | `feature/c2-staging-foundation` |
| C1 commit | `0eb1ea5c2bec8433bf672b3c899382a8a6f81971` |
| C2 commit | `7cea2a2c56f3398aab1cfe8c805f7bb79b15764b` |
| C2 commit message | `feat: add secure staging foundation` |
| Commit relationship | C1 is an ancestor of C2; C2 contains one 33-file milestone commit over C1 |
| Completion status | C2 implementation and local verification complete |
| Branch pushed | Yes; `origin/feature/c2-staging-foundation` contains C2 |
| Merged into `main` | No; local and remote `main` remain at C1 |
| Hosted staging | Not created during C2 |

Repository evidence confirms the Git state. The absence of hosted staging is based on the controlled C2 work record and runbook status; no external Supabase or Vercel account was queried while preparing this report.

Two documentation/implementation discrepancies were found during the report audit:

- The importer and audited source use `data/source/Archive_Q2_2026_1784837413 (1).xlsx`; the existing C2 deployment runbook omits ` (1)` from that filename. This report uses the importer-authoritative path. The runbook was not changed because this deliverable is restricted to one new report.
- `lib/data/config.ts` defines `validateApplicationEnvironment()`, including a rule that non-local deployments require live mode, but repository search finds no call site. Explicit `TOTALSCOPE_DATA_MODE` and live Supabase values are still enforced when their code paths execute, but the repository does not yet prove a single global build-time invocation of the full deployment validator.

## 3. User-Visible Behavior

The following flow was exercised through the local browser against live local Supabase:

- Direct signed-out access to `/dashboard` redirected to `/login?next=%2Fdashboard`.
- An admin-created email/password user signed in successfully.
- The authenticated dashboard rendered the 214-claim Q2 data rather than demo data.
- Claims Explorer loaded and linked to claim details.
- Claim detail rendered financial facts, matched updates, and sanitized provenance.
- Refresh and subsequent navigation retained the authenticated session.
- A viewer navigating directly to `/admin/imports/q2-2026` was redirected to `/dashboard?access=denied`.
- Sign-out returned the user to `/login`.
- Direct signed-out access to `/claims` again redirected to login.

Code review and automated tests additionally cover every guarded route layout, generic invalid-credential feedback, open-signup absence, disabled Enterprise SSO, and explicit local demo behavior. The hosted staging experience was not browser-tested because hosted environments do not yet exist.

In `TOTALSCOPE_DATA_MODE=demo`, protected page layouts do not require Supabase authentication. Demo data remains centralized, synthetic, and visibly labeled; it is never a fallback for a failed live request.

## 4. Authentication Architecture

Supabase Auth is the authentication provider. Staging uses administrator-created email/password users; there is no public signup flow.

- `app/login/page.tsx` renders the sign-in form.
- `app/auth/actions.ts` calls `signInWithPassword`, returns a generic failure message, validates the relative post-login path, and implements sign-out.
- `lib/supabase/client.ts` creates the browser client from the public project URL and anon key.
- `lib/supabase/server.ts` creates the cookie-aware server client.
- `middleware.ts` delegates to `lib/supabase/middleware.ts`.
- `lib/supabase/middleware.ts` refreshes cookies, redirects signed-out requests to login, preserves the requested protected path, and redirects signed-in users away from login.
- `lib/auth.ts` validates the user with `auth.getUser()` and implements `requireUser`, `requireLiveUser`, and `requireRole`.
- Route-level `layout.tsx` files independently call the server guards.

The live repository in `lib/data/supabase-rest.ts` first validates the user, obtains the current session, and sends the anon key plus that user's access token to PostgREST. The browser and authenticated application repository never use the service-role key.

Middleware is not the sole authorization boundary. It provides session refresh and the first redirect, but protected layouts verify the user again on the server. The admin layout also reads the active application profile and checks `staging_admin`. PostgreSQL grants and RLS remain the final data boundary even if navigation or middleware is bypassed.

## 5. Authorization and Roles

C2 supports exactly two application roles through the `public.application_role` enum:

- `viewer`
- `staging_admin`

`public.application_profiles` is one-to-one with `auth.users`. `public.create_application_profile()` creates an active profile with the default `viewer` role after an Auth user is created. Existing Auth users are backfilled as viewers when the migration runs.

A viewer may read the dashboard, claims, claim detail, approved financial facts, approved derived metrics, matched claim updates, organization display names, and sanitized source-row coordinates. A staging administrator receives the viewer capabilities plus controlled import-job, validation-view, and quality-issue reads.

Role elevation is not available through the browser, user metadata, or an authenticated mutation policy. Authenticated users receive read access only to their own active profile. Controlled role administration requires the service role or direct database administration. `app/admin/layout.tsx` calls `requireRole("staging_admin")`, and the database independently uses `private.is_staging_admin()` in admin RLS policies.

Important database objects include:

- `public.application_profiles`
- `public.create_application_profile()`
- `private.is_active_application_user()`
- `private.is_staging_admin()`
- `public.q2_2026_import_validation`
- `public.totalscope_health()`

The protection is therefore database-enforced and server-enforced, not merely hidden UI.

## 6. Database and Migration Changes

The only C2 migration is:

`supabase/migrations/202607230002_c2_staging_security.sql`

It is additive to `supabase/migrations/202607230001_c1_q2_2026_foundation.sql`. A direct Git comparison confirms the C1 migration is unchanged from the validated C1 commit.

C2 adds:

- enum `public.application_role`;
- table `public.application_profiles`;
- an Auth-user trigger and `public.create_application_profile()` function;
- private role-check functions;
- viewer and staging-admin RLS policies;
- column-level authenticated grants for approved canonical fields;
- narrowly scoped service-role grants for profile administration and validation;
- health function `public.totalscope_health()`.

C2 adds no new data view and no columns to C1 tables. It changes the existing `public.q2_2026_import_validation` view to `security_invoker=true`, causing it to respect the querying role's underlying grants and RLS. Staging-admin policies permit its required reads; viewers remain denied. The service role receives the underlying read grants required by the already-validated C1 validation operation.

All public tables and sequences are first revoked from `anon` and `authenticated`, after which only approved column grants are restored. Authenticated mutations remain revoked. C1 import RPC execution remains service-role-only.

## 7. Data-Access Boundaries

Viewers and staging administrators may read only approved canonical columns:

- claim identity, lifecycle, dates, status, and organization relationships;
- contractor and carrier display values;
- normalized financial values and explicit availability status;
- approved derived metric values and reconciliation metadata;
- matched claim updates;
- source worksheet row coordinates needed for sanitized provenance.

Staging administrators may additionally read controlled import metadata, validation counts, and quality-issue fields required by the import-validation page.

The following remain unavailable to browser roles:

- raw source-row JSON;
- source files and source worksheet metadata;
- raw staging claim rows;
- organization aliases and person aliases;
- people records;
- unmatched updates;
- unrestricted import metadata;
- import mutation RPCs;
- workbook checksum and import-job internals on viewer claim detail;
- browser profile mutation or role elevation.

The viewer claim detail deliberately changed from technical provenance to sanitized provenance. It shows source system, worksheet/row, and source item ID, but not workbook hashes or import-job identifiers.

Browser-safe code uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Live queries add the authenticated user's JWT. `SUPABASE_SERVICE_ROLE_KEY` is permitted only for explicit importer operations and controlled server/database administration; it is prohibited from client bundles and Vercel browser configuration.

## 8. Importer Safeguards

The Q2 importer now requires two matching declarations:

1. `TOTALSCOPE_IMPORT_TARGET` must be `local` or `staging`.
2. `--confirm-target` must match that value.

It rejects missing, mismatched, unsupported, and production-like targets. A `local` target must use a loopback hostname. Before batch one, it prints a non-secret summary containing the declared environment, local/hosted classification, and hostname. It never prints credentials.

Safe local commands:

```powershell
$env:TOTALSCOPE_IMPORT_TARGET="local"
npm run import:q2-2026 -- --confirm-target local
npm run validate:q2-2026-import
```

Safe hosted-staging command shape:

```powershell
$env:TOTALSCOPE_IMPORT_TARGET="staging"
npm run import:q2-2026 -- --confirm-target staging
npm run validate:q2-2026-import
```

The parser, source fingerprint, 81-batch plan, bounded batch sizes, count-gated finalization, canonical counts, retry behavior, and idempotency model remain unchanged. Local verification completed a first import and validation, then a second import and validation. Both used the same import job and retained:

- 214 claims;
- 177 Complete;
- 37 Closed;
- 148 staged subitem headers;
- 1,359 staged subitem details;
- 5,957 updates;
- 58 unmatched update rows;
- 56 unmatched update item IDs;
- 5,957 unique post IDs;
- 213 exact additional-RCV reconciliations;
- 0 tolerance-only matches;
- 0 mismatches;
- 1 missing component.

Before hosted import, Michael must create the separate staging project, apply both migrations, store importer credentials securely outside Vercel/browser code, confirm the target summary, run the validation, rerun for idempotency, and validate again. The importer-authoritative workbook `data/source/Archive_Q2_2026_1784837413 (1).xlsx` must remain ignored and untracked.

## 9. Environment Variables

| Variable | Requirement | Scope | Exposure | Purpose | Missing/invalid behavior |
|---|---|---|---|---|---|
| `TOTALSCOPE_DATA_MODE` | Required | Local and hosted | Server/application configuration | Explicitly selects `demo` or `live` | Throws if absent or not `demo`/`live`; no silent demo fallback |
| `TOTALSCOPE_DEPLOYMENT_ENV` | Optional locally; required operationally for clear staging configuration | Local and hosted | Server/application configuration | Selects `local`, `staging`, or `production`; defaults to `local` | The validator throws for an unsupported value and rejects non-local demo mode, but that validator currently has no repository call site |
| `NEXT_PUBLIC_SUPABASE_URL` | Required in live mode | Local live and hosted | Browser-safe project identifier | Supabase browser/server client and health RPC URL | Live environment validation fails if absent or not an absolute HTTP(S) URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required in live mode | Local live and hosted | Browser-safe publishable key | Browser/server client and authenticated PostgREST requests | Live environment validation fails if absent |
| `SUPABASE_URL` | Required for import/validation | Local import and hosted staging import | Server/importer-only | Importer and validation target | Import fails; database validation reports skipped if neither importer variable is configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for import/validation | Local import and hosted staging import | Secret, server/importer-only | Executes service-role-only C1 import and validation operations | Import fails; must never be prefixed `NEXT_PUBLIC_` or placed in browser/Vercel app variables |
| `TOTALSCOPE_IMPORT_TARGET` | Required for import | Local or hosted staging import | Server/importer-only | Declares `local` or `staging` target | Import rejects absence, unsupported values, mismatch, and prohibited target shapes |
| `PYTHON` | Optional | Local importer utility | Local process configuration | Overrides the Python executable used by the Node wrapper | Wrapper uses its known bundled runtime when present, otherwise `python` |

The CLI flag `--confirm-target local|staging` is not an environment variable, but it is independently mandatory for import and must match `TOTALSCOPE_IMPORT_TARGET`.

## 10. Routes and Endpoints

| Route | Purpose | Signed-out behavior in live mode | Viewer | `staging_admin` | Protection |
|---|---|---|---|---|---|
| `/login` | Email/password sign-in | Available | Redirected to dashboard if already signed in | Same | Middleware plus server action |
| `/dashboard` | Live executive dashboard | Redirect to `/login` | Allowed | Allowed | Middleware, `app/dashboard/layout.tsx`, authenticated repository, RLS |
| `/claims` | Claims Explorer | Redirect to `/login` | Allowed | Allowed | Middleware, `app/claims/layout.tsx`, authenticated repository, RLS |
| `/claims/[id]` | Claim detail | Redirect to `/login` | Allowed approved fields | Allowed approved fields | Claims layout, page guard, repository, column grants, RLS |
| `/operations` | Operations analytics | Redirect to `/login` | Allowed | Allowed | Middleware and route layout |
| `/weather` | Synthetic weather opportunity analytics | Redirect to `/login` | Allowed | Allowed | Middleware and route layout |
| `/carriers` | Carrier analytics | Redirect to `/login` | Allowed | Allowed | Middleware and route layout |
| `/contractors` | Contractor analytics | Redirect to `/login` | Allowed | Allowed | Middleware and route layout |
| `/reports` | Reports demonstration | Redirect to `/login` | Allowed | Allowed | Middleware and route layout |
| `/settings` | Settings demonstration | Redirect to `/login` | Allowed | Allowed | Middleware and route layout |
| `/admin/imports/q2-2026` | Import validation | Redirect to `/login` | Redirect to `/dashboard?access=denied` | Allowed | Middleware, `app/admin/layout.tsx`, role lookup, admin RLS |
| `/client-dashboard` | Legacy redirect to `/operations` | Redirect target is protected | Indirectly allowed through operations | Same | Server redirect followed by protected operations route |
| `/api/health` | Coarse app/config/database health | Public coarse response | Same response | Same response | Public endpoint; anon/auth health RPC; no secret or count output |

In explicit local demo mode, `requireLiveUser()` does not demand a Supabase session. The admin layout similarly checks the application role only in live mode.

## 11. Tests and Verification Evidence

Verified C2 evidence:

| Verification | Result | Evidence |
|---|---|---|
| Fresh local Supabase reset | Passed | Both C1 and C2 migrations applied from scratch |
| C1 migration integrity | Passed | No diff from C1 commit |
| First Q2 import | Passed | All 81 batches and count-gated finalize completed |
| Canonical database counts | Passed | All counts listed in section 8 matched |
| Second import/idempotency | Passed | Same import job and counts reused |
| Live RLS/database probe | Passed | `npm run test:c2-db`; temporary user removed afterward |
| Viewer approved claim read | Passed | `tests/c2-database-security.mjs` |
| Viewer raw-row denial | Passed | `tests/c2-database-security.mjs` |
| Viewer validation denial | Passed | Database probe and browser |
| Viewer self-elevation denial | Passed | Database probe |
| Controlled admin validation | Passed | Database probe after controlled promotion |
| Browser sign-in | Passed | Local browser verification |
| Dashboard rendering | Passed | Live 214-claim dashboard rendered |
| Claims Explorer | Passed | Live list and claim links rendered |
| Claim detail | Passed | Financial facts, matched updates, sanitized provenance rendered |
| Refresh/session persistence | Passed | Reload and subsequent navigation retained the session |
| Sign-out/direct URL denial | Passed | Sign-out followed by `/claims` redirect to login |
| Offline automated suite | 15/15 passed | `tests/c1-import.test.mjs`, `tests/c2-security.test.mjs` |
| TypeScript | Passed | `npm run typecheck` |
| ESLint | Passed | `npm run lint` |
| Production build | Passed | `npm run build`, Next.js 15.5.21 |
| Diff hygiene | Passed | `git diff --check` |
| Workbook exclusion | Passed | `.gitignore` rule matched; no `data/source/*` file tracked |

`tests/c2-security.test.mjs` checks role constraints, raw-table denial, admin route enforcement, authenticated JWT repository behavior, service-role exclusion from application/client sources, explicit data mode, route guards, import confirmation, and coarse health output. `tests/c2-database-security.mjs` is the live local integration probe.

## 12. Issues Found and Corrected During C2

### Validation view underlying privileges

Changing `public.q2_2026_import_validation` to `security_invoker` was necessary so browser access would obey the caller's privileges and RLS. The C1 service-role validator initially received a 403 because it lacked direct reads on the underlying tables. C2 added only the underlying service-role `SELECT` grants required by validation. Browser roles remained restricted.

### Controlled profile administration

The live security probe confirmed viewer denial but also showed that the controlled promotion path lacked service-role permission on `application_profiles`. C2 granted service-role profile administration while retaining no authenticated insert, update, or delete policy. This enabled controlled server/database role assignment without allowing self-elevation.

### Viewer dashboard dependency

The first browser sign-in reached the dashboard, but its summary attempted to read the admin-only validation view and correctly received 403. The repository was corrected to calculate total, Complete, and Closed counts from the viewer-approved, RLS-protected claims surface. Admin validation stayed isolated and no broader grant was introduced.

## 13. Dependency Changes and Security Advisories

C2 added:

- `@supabase/ssr` — supported cookie-backed browser/server Supabase integration;
- `@supabase/supabase-js` — Supabase Auth, browser data access, and local security-probe client.

The current `npm audit --json` result is five high-severity package entries, zero critical. No automatic `npm audit fix` or potentially breaking forced fix was applied.

| Audited package | Direct/transitive | Installed path | Audit relationship |
|---|---|---|---|
| `next` | Direct (`15.5.21`) | Application dependency | Marked affected through its bundled `postcss` and optional `sharp` paths |
| `postcss` | Transitive | `next@15.5.21 > postcss@8.4.31` | Two advisories; the separate Tailwind path uses `postcss@8.5.14` |
| `sharp` | Transitive/optional through Next | `next@15.5.21 > sharp@0.34.5` | libvips-related advisory |
| `js-yaml` | Transitive development dependency | `eslint > @eslint/eslintrc > js-yaml@4.1.1` | YAML alias/merge-key denial-of-service advisories |
| `brace-expansion` | Transitive development dependency | `eslint > minimatch@3.1.5 > brace-expansion@1.1.14` | Exponential expansion denial-of-service advisory |

The audit's suggested resolution for the Next-related chain currently reports `next@9.3.3` as a semver-major change, which is not a credible automatic upgrade path for this Next.js 15 application. The advisories and available patched dependency paths should be reviewed manually before hosted staging. This report does not infer exploitability in TotalScope; it records the package paths reported by npm.

## 14. Local Development Instructions

Prerequisites: Node.js `>=22.13.0`, Docker Desktop, Supabase CLI through `npx`, Python usable by the importer wrapper, and the ignored Q2 workbook at `data/source/Archive_Q2_2026_1784837413 (1).xlsx`.

Install and start local Supabase:

```powershell
npm install
npx --yes supabase@latest start
npx --yes supabase@latest db reset --local
npx --yes supabase@latest status
```

Copy the example and replace placeholders with local values reported by Supabase:

```powershell
Copy-Item .env.example .env.local
```

For authenticated local live mode, set in `.env.local`:

```text
TOTALSCOPE_DATA_MODE=live
TOTALSCOPE_DEPLOYMENT_ENV=local
NEXT_PUBLIC_SUPABASE_URL=<LOCAL_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<LOCAL_ANON_KEY>
```

Set importer-only values in the current PowerShell session or another approved local secret source:

```powershell
$env:SUPABASE_URL="<LOCAL_SUPABASE_URL>"
$env:SUPABASE_SERVICE_ROLE_KEY="<LOCAL_SERVICE_ROLE_KEY>"
$env:TOTALSCOPE_IMPORT_TARGET="local"
npm run import:q2-2026 -- --confirm-target local
npm run validate:q2-2026-import
```

For explicit synthetic demo mode:

```powershell
$env:TOTALSCOPE_DATA_MODE="demo"
$env:TOTALSCOPE_DEPLOYMENT_ENV="local"
npm run dev
```

For authenticated live mode, ensure `.env.local` contains the live variables above, then:

```powershell
npm run dev
```

Open `http://localhost:3000/login`. Use local Supabase Studio, whose URL is shown by `npx --yes supabase@latest status`, to create an email/password user under Authentication. New users receive `viewer`.

To assign a local staging administrator, run this controlled statement in the local Supabase SQL editor using the Auth user UUID:

```sql
update public.application_profiles
set role = 'staging_admin'::public.application_role, updated_at = now()
where user_id = '<AUTH_USER_UUID>';
```

Validation commands:

```powershell
npm test
npm run test:c2-db
npm run typecheck
npm run lint
npm run build
git diff --check
```

`npm run test:c2-db` additionally requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the process environment and a populated local database.

Stop the Next.js development server with `Ctrl+C` in its terminal. Stop the local Supabase stack with:

```powershell
npx --yes supabase@latest stop
```

## 15. Hosted Supabase Manual Setup

**Not yet performed.**

Michael will need to:

1. Create a new Supabase project dedicated to staging.
2. Store its project URL, anon key, service-role key, database password, and project reference in approved secret storage.
3. Disable public signup while retaining administrator-created email/password users.
4. Link the CLI and apply C1 followed by C2 migrations.
5. Create initial staging users and promote only the designated administrator through the controlled database path.
6. Run the explicit staging import and both validation passes.
7. Verify viewer, staging-admin, raw-table, mutation-RPC, and self-elevation boundaries.
8. Keep the service-role key in importer/server-only environments.

Follow `docs/runbooks/c2-staging-deployment.md` for the detailed commands and acceptance checklist.

## 16. Vercel Staging Manual Setup

**Not yet performed.**

Michael will need to create a separate Vercel staging project, select the C2 feature/staging branch, configure live/staging mode and only the public Supabase URL and anon key, deploy, check `/api/health`, test sign-in and callbacks/allowed application URLs in Supabase Auth configuration, and execute the full hosted acceptance checklist.

The service-role key, database password, importer target, and source workbook must not be added to Vercel. See `docs/runbooks/c2-staging-deployment.md`. The runbook identifies required Vercel values and verification; the exact hosted callback/site URLs cannot be configured until the staging deployment URL exists.

## 17. Known Gaps and Deferred Work

### Acceptable staging gaps

- Enterprise SSO is disabled.
- Password-recovery customization is not implemented.
- MFA enforcement policy is not implemented.
- Production-grade observability and audit-event export are not implemented.
- Some domain pages outside the C1 dashboard/claims vertical slice still present explicitly labeled synthetic analytics.
- Exports, scheduled reports, alerts, settings persistence, integrations, and notifications remain disabled placeholders.

### Production blockers

- Production authentication rollout and policy hardening.
- Production observability, incident response, and audit retention.
- Production backup, restore, and disaster-recovery validation.
- Formal secrets-management and key-rotation operations.
- Security-advisory review and safe dependency remediation.
- Global invocation of `validateApplicationEnvironment()` so the complete deployment-mode contract is enforced at build/runtime entry.
- Correction of the workbook filename in the existing C2 deployment runbook.
- Hosted acceptance and production-specific threat/security review.

### Future product features, not C2 security gaps

- Billing and Stripe collection reconciliation.
- Live weather observations or forecast integration.
- Enterprise SSO.
- Additional approved source quarters and analytics.
- AI functionality; no chatbot or AI-generated business conclusions are included.

## 18. Rollback and Recovery

Do not delete C2 work or use a destructive reset merely to inspect C1.

Switch to the current `main` branch:

```powershell
git switch main
```

Inspect C1 in detached mode:

```powershell
git switch --detach 0eb1ea5c2bec8433bf672b3c899382a8a6f81971
```

Create a recoverable branch from C1:

```powershell
git switch -c recovery/c1-local 0eb1ea5c2bec8433bf672b3c899382a8a6f81971
```

If C2 is later merged and must be backed out, create a new revert commit after confirming the target branch and clean working tree:

```powershell
git revert 7cea2a2c56f3398aab1cfe8c805f7bb79b15764b
```

Review and test the generated revert before pushing it. Avoid `git reset --hard`, forced pushes, or migration-history deletion unless backups, exact targets, and explicit intent have been confirmed.

Changing Git commits does not undo an already-applied database migration. Supabase migrations are forward-oriented. For disposable local recovery, switch to the intended code and run a fresh:

```powershell
npx --yes supabase@latest db reset --local
```

For hosted staging, prefer recreating/restoring the disposable staging project or applying a separately reviewed compensating migration. Never assume a Git rollback reverses hosted schema state.

## 19. Readiness Assessment

| Area | Status | Assessment |
|---|---|---|
| Local development readiness | Complete | Install, reset, import, test, and run procedures verified |
| Local authentication readiness | Complete | Sign-in, persistence, refresh, and sign-out browser-tested |
| Local authorization readiness | Complete | Server guards, roles, grants, RLS, and live denials verified |
| Importer readiness | Complete for local; ready for controlled staging use | C1 behavior preserved; target guard and idempotency verified |
| Hosted Supabase readiness | Ready for manual setup | Migration and runbook prepared; project not created |
| Vercel staging readiness | Ready for manual setup | Environment and acceptance instructions prepared; deployment not created |
| Production readiness | Not production-ready | Production controls and deferred work remain |

## 20. Recommended Next Step

The next controlled milestone should be **C2.1 Hosted Staging Deployment**:

1. Review this completion report.
2. Review and disposition the npm advisories.
3. Create the hosted Supabase staging project.
4. Apply both migrations.
5. Configure authentication and the initial staging administrator.
6. Import the validated Q2 data and prove idempotency.
7. Create the Vercel staging deployment.
8. Run the full hosted acceptance checklist.
9. Only then decide whether to merge C2 into `main`.

None of these C2.1 actions were performed while preparing this report.
