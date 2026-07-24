# C2.1 Hosted Staging Deployment — Execution Plan

## 1. Objective

C2.1 will take the locally validated C2 security foundation and establish an isolated hosted staging system using a new Supabase project and a new Vercel project. Hosted staging is the next milestone because authentication, authorization, import safety, and the live vertical slice have passed locally but have not yet been exercised across hosted services.

Success is a private staging URL where an authorized user can:

- sign in with an administrator-created account;
- remain signed in after refresh;
- view the Q2 executive dashboard;
- browse Claims Explorer;
- open claim details with sanitized provenance;
- receive the correct viewer and staging-administrator authorization behavior;
- sign out and lose protected-route access;
- access the coarse `/api/health` endpoint without exposing internals.

C2.1 does not include production deployment, production data, a merge into `main`, additional datasets, application redesign, migration redesign, DNS changes, billing, SSO, MFA rollout, or remediation of unrelated product gaps. This document is a plan only; it creates no hosted resource and performs no hosted write.

## 2. Starting State

| Item | Verified state |
|---|---|
| Repository | `msjbco/totalscope-intelligence` |
| Local repository | `C:\Users\msjbc\Documents\TotalScope-Intelligence 2` |
| Branch | `feature/c2-staging-foundation` |
| Current HEAD | `ac8dc48f8c8eb590466f883d2d75e2e0102c7212` |
| C2 implementation | `7cea2a2c56f3398aab1cfe8c805f7bb79b15764b` |
| C2 completion report | `ac8dc48f8c8eb590466f883d2d75e2e0102c7212` |
| Local validation | Complete: reset, two imports, canonical counts, RLS probe, browser flow, 15/15 tests, typecheck, lint, build, and diff hygiene passed |
| Branch pushed | Partially: `origin/feature/c2-staging-foundation` exists at C2 implementation commit `7cea2a2`; local completion-report HEAD `ac8dc48` is not on the remote |
| Merged into `main` | No; `main` remains at C1 |
| Hosted Supabase staging | Not created during verified C2 work; external account state has not been queried |
| Vercel staging | Not created during verified C2 work; external account state has not been queried |

The working tree was clean before this plan was created.

## 3. Deployment Principles and Guardrails

- Staging must use dedicated resources and names that cannot be mistaken for production.
- Do not reuse a production Supabase project, database password, key, Vercel project, domain, or user.
- Never place a service-role key, database password, connection string, or importer secret in browser code or a `NEXT_PUBLIC_` variable.
- Import only the checksum-validated Q2 workbook already approved for C1/C2.
- Every hosted import must use `TOTALSCOPE_IMPORT_TARGET=staging` and `--confirm-target staging`.
- Keep both migration files unchanged and apply them in timestamp order.
- Complete migration, RLS, import, Auth, browser, and operational validation before considering a merge into `main`.
- Preserve the feature branch and its commits so rollback never requires deleting C2 work.
- Store secrets only in Supabase, Vercel's approved secret surface where applicable, an approved local secret manager, or the current process environment.
- Do not put `.env` files, workbook data, keys, passwords, tokens, connection strings, or evidence containing them into Git.
- Approval for one hosted action does not authorize any later action.
- Stop on ambiguity. Do not guess a target, credential type, project reference, migration state, or expected count.

## 4. Required Accounts, Access, and Manual Actions

### Michael must have

- [ ] GitHub access to `msjbco/totalscope-intelligence`.
- [ ] Supabase organization access with permission to create and administer a staging project.
- [ ] Vercel team access with permission to import the repository and configure a staging project.
- [ ] Access to `data/source/Archive_Q2_2026_1784837413 (1).xlsx`.
- [ ] Access to `.env.example`, `docs/architecture/c2-staging-security.md`, `docs/runbooks/c2-staging-deployment.md`, and this plan.
- [ ] An approved password/secret manager.
- [ ] A secure method to copy hosted values without pasting them into chat, logs, source files, or screenshots.
- [ ] Authority to create the initial hosted Auth users and approve the initial `staging_admin`.
- [ ] Access to the staging mailbox if email confirmation is enabled.
- [ ] Authority to approve any expected staging cost.

### Codex may perform locally after the relevant approval

- Read repository state and inspect non-secret command output.
- Run offline tests, typecheck, lint, build, and Git checks.
- Run Supabase CLI commands that Michael has specifically approved for the named staging project.
- Run the explicit importer only after separate import approval and only when Michael has supplied secrets through an approved local mechanism.
- Assist with browser acceptance after Michael authorizes hosted testing and supplies/enters test credentials safely.
- Draft a secret-free evidence report.

### Michael must perform in hosted dashboards

- Create the Supabase and Vercel staging projects.
- Select organizations, teams, regions, plans, branch settings, and cost controls.
- Generate/store database credentials and obtain project values.
- Configure Supabase Auth providers, signup policy, site URL, and redirect URLs.
- Create or invite hosted users and verify required email delivery.
- Enter Vercel environment variables.
- Review billing/usage dashboards.

### Explicit approval is required before

Any hosted resource creation, linking, migration, user creation, role change, import, environment mutation, deployment, Auth URL change, hosted browser test, cleanup, commit, push, or merge.

## 5. Naming Convention

Recommended unambiguous examples:

| Resource | Recommended example | Rule |
|---|---|---|
| Supabase project | `totalscope-intelligence-staging` | Include `staging`; never reuse a production name |
| Vercel project | `totalscope-intelligence-staging` | Dedicated project, not the future production project |
| Environment label | `staging` | Matches `TOTALSCOPE_DEPLOYMENT_ENV` |
| Deployment branch | `feature/c2-staging-foundation` | Use the verified C2 branch until merge is separately approved |
| Initial admin identity label | `TotalScope Staging Admin — Michael` | Use Michael's approved staging email; never encode role in editable user metadata |
| Viewer test identity label | `TotalScope Staging Viewer Test` | Dedicated temporary acceptance identity |
| Optional custom domain | `staging.<approved-domain>` | Must visibly indicate staging; DNS is outside C2.1 unless separately approved |

Do not use `prod`, `production`, an unlabeled company name, or a customer name for staging resources.

## 6. Hosted Supabase Project Creation

**HOSTED WRITE — APPROVAL REQUIRED: creating the Supabase project.**

Michael's manual checklist:

1. Select the intended Supabase organization.
2. Confirm no existing project already serves this exact staging purpose; do not create duplicates.
3. Create a project named `totalscope-intelligence-staging` or another approved name containing `staging`.
4. Select a region appropriate for the intended staging users and data-handling requirements. Record the decision, not the password.
5. Select the lowest appropriate staging tier after reviewing current Supabase pricing and limits.
6. Generate a unique database password and store it directly in the approved secret manager.
7. Label the project as staging in the project name and internal evidence.
8. After provisioning, securely capture:
   - project reference;
   - project URL;
   - anon/publishable key;
   - service-role/secret key;
   - database connection information, only if the CLI workflow requires it.
9. Do not paste secret values into Codex, terminal history, tickets, screenshots, or repository files.

Value classification:

| Value | Classification | Permitted destination |
|---|---|---|
| Project URL | Browser-safe identifier | Vercel `NEXT_PUBLIC_SUPABASE_URL`, approved evidence if desired |
| Anon/publishable key | Browser-safe by design, still environment-managed | Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Project reference | Non-secret identifier | Local CLI link command and secret-free evidence |
| Service-role/secret key | Highly privileged server-only secret | Approved local importer environment/secret manager only |
| Database password | Server/administration secret | Secret manager and interactive CLI prompt only |
| Direct/pooler connection strings | Private | Secret manager; never repository or browser |

Stop if the selected project, organization, region, or plan could be confused with production.

## 7. Supabase Authentication Configuration

### Before the Vercel URL exists

**HOSTED WRITE — APPROVAL REQUIRED: changing Auth configuration.**

1. Enable the email/password provider.
2. Disable public signup; users must be created or invited by an administrator.
3. Decide whether staging requires email confirmation:
   - enabled gives a closer test of invitation/confirmation behavior and requires a working mailbox;
   - disabled simplifies controlled staging setup but must be documented as a staging-only choice.
4. Review the hosted password policy and choose a staging policy suitable for security testing.
5. Do not enable Enterprise SSO or MFA enforcement in C2.1.
6. Do not create users until migrations have created the profile table and trigger.

### After a stable Vercel staging URL exists

**HOSTED WRITE — APPROVAL REQUIRED: changing site/redirect URLs.**

1. Set the Supabase Auth Site URL to the stable staging URL.
2. Add the exact stable staging URL to allowed redirect URLs.
3. Add only specifically approved Vercel preview URL patterns if preview Auth testing is required.
4. Do not add production domains or broad redirect patterns merely for convenience.
5. Test login, refresh persistence, logout, and any enabled email-confirmation link.

The current application signs in with password directly and does not implement an OAuth callback route. Site and redirect URLs still matter for confirmation/recovery links and future Auth flows. Exact hosted URLs cannot be configured until Vercel provides them.

### Users

- Create one permanent or controlled staging administrator.
- Create one viewer acceptance account.
- Use distinct staging-only identities.
- Remove temporary accounts after acceptance if they are not needed for continued testing.
- Never store user passwords in Git or evidence.

## 8. Hosted Database Migration Procedure

Authoritative local migrations:

1. `supabase/migrations/202607230001_c1_q2_2026_foundation.sql`
2. `supabase/migrations/202607230002_c2_staging_security.sql`

### Local read-only preparation

```powershell
git status --short
git rev-parse HEAD
git diff --exit-code 0eb1ea5c2bec8433bf672b3c899382a8a6f81971 -- supabase/migrations/202607230001_c1_q2_2026_foundation.sql
Get-ChildItem supabase/migrations
```

Expected: clean tree, HEAD `ac8dc48f8c8eb590466f883d2d75e2e0102c7212`, no C1 migration diff, and exactly the two approved migrations.

Run the offline/local application checks with explicit demo boundaries:

```powershell
$env:TOTALSCOPE_DATA_MODE="demo"
$env:TOTALSCOPE_DEPLOYMENT_ENV="local"
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Do not proceed if any command fails.

### Link and inspect

**HOSTED WRITE — APPROVAL REQUIRED: linking the repository to the named staging project.**

```powershell
npx --yes supabase@latest login
npx --yes supabase@latest link --project-ref <STAGING_PROJECT_REF>
```

Use an interactive password prompt or approved environment—not a password embedded in the command.

Then inspect:

```powershell
npx --yes supabase@latest migration list --linked
npx --yes supabase@latest db push --linked --dry-run
```

The dry run must list only the expected C1 and C2 migrations. Stop on unexpected remote history, missing files, altered timestamps, or any destructive statement.

### Apply

**HOSTED WRITE — APPROVAL REQUIRED: applying migrations to hosted staging.**

```powershell
npx --yes supabase@latest db push --linked
```

### Verify

```powershell
npx --yes supabase@latest migration list --linked
```

In the Supabase SQL editor, inspect—not mutate—the expected objects:

- `public.application_profiles`;
- `public.application_role`;
- `public.q2_2026_import_validation` with security-invoker behavior;
- `public.create_application_profile()`;
- `private.is_active_application_user()`;
- `private.is_staging_admin()`;
- `public.totalscope_health()`;
- RLS enabled on C1 tables and profiles;
- authenticated column grants and denied mutations;
- service-role-only C1 import functions.

Do not run the importer until migration history and security objects pass review.

## 9. Hosted Environment Variables

| Variable | Vercel environment | Local/hosted use | Exposure | Source | Purpose | Before build | Before import | Missing behavior |
|---|---|---|---|---|---|---:|---:|---|
| `TOTALSCOPE_DATA_MODE` | Staging project's stable deployment environment | Both | Application configuration | Fixed value `live` | Selects live repository | Yes | No | Application throws when mode is absent/invalid |
| `TOTALSCOPE_DEPLOYMENT_ENV` | Staging project's stable deployment environment | Both | Application configuration | Fixed value `staging` | Labels deployment boundary | Operationally yes | No | Defaults to `local`; full validator would reject invalid/non-live staging, but has no global call site |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project's stable deployment environment | Both live modes | Browser-safe | Hosted Supabase project settings | Browser/server Supabase base URL | Yes | No | Live client/repository/health path fails clearly |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging project's stable deployment environment | Both live modes | Browser-safe publishable key | Hosted Supabase project settings | Auth and user-scoped data requests | Yes | No | Live client/repository/health path fails clearly |
| `SUPABASE_URL` | Never in Vercel for C2.1 importer | Local process targeting hosted staging | Server/importer-only | Hosted Supabase project settings | Import and validation API target | No | Yes | Import fails; validation skips/fails according to command |
| `SUPABASE_SERVICE_ROLE_KEY` | Never in Vercel | Local process targeting hosted staging | Highly privileged secret | Hosted Supabase API settings | Import RPC, validation, controlled database probe | No | Yes | Import fails; must never enter browser bundle |
| `TOTALSCOPE_IMPORT_TARGET` | Never in Vercel | Local importer process | Server/importer-only | Fixed value `staging` | Explicit target declaration | No | Yes | Import rejects |
| `PYTHON` | No | Optional local importer process | Local configuration | Local runtime path | Python override | No | Optional | Wrapper uses bundled Python when available, then `python` |

Uncertainty: `validateApplicationEnvironment()` implements the complete `staging => live + public Supabase values` contract, but repository search finds no call site. Live routes still demand explicit mode and Supabase values through their executed code paths. Before deployment, treat all four Vercel variables as mandatory and validate build/runtime output manually. A future code milestone should wire the centralized validator globally.

Never put the service-role key, database password, connection strings, or importer variables into Vercel.

## 10. Initial Hosted Administrator

Perform only after C2 migration success.

1. **HOSTED WRITE — APPROVAL REQUIRED:** Michael creates the first email/password user in Supabase Auth.
2. Verify the email and immutable Auth user UUID in the Supabase dashboard.
3. Read `public.application_profiles` and confirm the trigger created exactly one active `viewer` profile for that UUID.
4. Stop if the profile is missing, duplicated, inactive, or not `viewer`.
5. **HOSTED WRITE — APPROVAL REQUIRED: sensitive role change.** In the hosted SQL editor, execute the documented controlled statement with the verified UUID:

   ```sql
   update public.application_profiles
   set role = 'staging_admin'::public.application_role, updated_at = now()
   where user_id = '<VERIFIED_AUTH_USER_UUID>';
   ```

6. Read the profile back and confirm exactly one row changed to `staging_admin`.
7. Sign in and verify the admin route.
8. Confirm the browser cannot update `application_profiles`.

The repository contains no public admin API for elevation. Use the documented direct database/service-role administration path only. Never use editable Auth metadata as authorization and never let the user self-elevate.

## 11. Hosted Import Preparation

1. Confirm the actual file exists:

   ```powershell
   Test-Path -LiteralPath "data/source/Archive_Q2_2026_1784837413 (1).xlsx"
   ```

2. Confirm the importer-authoritative filename includes ` (1)`. The older runbook path without ` (1)` is a documented discrepancy.
3. Confirm it is ignored and untracked:

   ```powershell
   git check-ignore -v "data/source/Archive_Q2_2026_1784837413 (1).xlsx"
   git ls-files "data/source/*"
   ```

4. Inspect locally before connecting to hosted staging:

   ```powershell
   npm run inspect:q2-2026
   ```

5. Expected SHA-256 is enforced inside the importer. Do not use `--allow-checksum-override` for hosted staging.
6. Confirm the hosted project reference and URL against Michael's staging record.
7. Load `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into the current local PowerShell process from approved secret storage without printing them.
8. Set:

   ```powershell
   $env:TOTALSCOPE_IMPORT_TARGET="staging"
   ```

9. The import command must include:

   ```powershell
   --confirm-target staging
   ```

10. Read the sanitized target summary before batch one. Stop if it is missing, ambiguous, production-like, or not the approved hosted staging hostname.

Expected behavior:

- 81 bounded batches;
- count-gated finalization;
- conflict-safe retry;
- one logical import job for the source/importer fingerprint;
- canonical counts listed in section 12;
- no duplicate canonical rows after rerun.

## 12. Hosted Import Execution Plan

### 1. Pre-import validation

**VALIDATION — read-only.**

- Confirm migration history.
- Confirm no prior Q2 import job exists unless this is a documented retry.
- Confirm canonical/import tables are empty for a new project.
- Confirm C1 import RPCs remain service-role-only.
- Confirm target values are loaded but not printed.

The hosted SQL editor may be used for this read-only count check:

```sql
select
  (select count(*) from public.import_jobs) as import_jobs,
  (select count(*) from public.claims) as claims,
  (select count(*) from public.claim_updates) as claim_updates;
```

For a new project before import, all three counts must be zero.

### 2. Target confirmation

**STOP GATE.** Michael compares the non-secret project reference/hostname with the approved staging record.

### 3. First hosted import

**HOSTED WRITE — APPROVAL REQUIRED.**

```powershell
$env:TOTALSCOPE_IMPORT_TARGET="staging"
npm run import:q2-2026 -- --confirm-target staging
```

### 4. First validation

**VALIDATION — hosted read using importer credentials.**

```powershell
npm run validate:q2-2026-import
```

### 5. Canonical comparison

Require:

| Measure | Expected |
|---|---:|
| Claims | 214 |
| Complete | 177 |
| Closed | 37 |
| Staged subitem headers | 148 |
| Staged subitem details | 1,359 |
| Updates | 5,957 |
| Unmatched update rows | 58 |
| Unmatched update item IDs | 56 |
| Unique post IDs | 5,957 |
| Exact additional-RCV matches | 213 |
| Tolerance-only matches | 0 |
| Mismatches | 0 |
| Missing component | 1 |

Stop on any difference.

### 6. Idempotency import

**HOSTED WRITE — APPROVAL REQUIRED.**

```powershell
npm run import:q2-2026 -- --confirm-target staging
```

### 7. Second validation

```powershell
npm run validate:q2-2026-import
```

### 8. Identity comparison

Confirm the second run reused the same logical import-job UUID/fingerprint and every canonical count remained unchanged.

### 9. Failure handling

- Stop subsequent steps.
- Preserve the command, timestamp, batch number/phase, sanitized target, and error response.
- Do not paste keys or full environment output into evidence.
- Do not improvise SQL deletes or rerun with checksum override.
- Determine whether the failed batch was atomic and whether retry is safe from importer evidence.
- Obtain explicit approval before retrying.

### 10. Cleanup after failure

- Leave source and database evidence intact.
- Clear secret environment variables when the terminal session ends.
- Do not delete an import job, truncate tables, reset hosted data, or recreate the project without separate destructive-action approval.
- Prefer a reviewed retry or, for disposable staging, a separately approved project recreation.

## 13. Vercel Project Creation

**HOSTED WRITE — APPROVAL REQUIRED: creating the Vercel staging project.**

Michael's manual setup:

1. Select the intended Vercel team.
2. Confirm no existing project already represents TotalScope staging.
3. Import `msjbco/totalscope-intelligence`.
4. Name the project `totalscope-intelligence-staging`.
5. Set the production branch of this staging-only Vercel project to `feature/c2-staging-foundation`.
6. Keep root directory at repository root (`.`).
7. Framework preset: Next.js, detected from `next@15.5.21`.
8. Install command: repository default `npm install`.
9. Build command: `npm run build`.
10. Output: use Vercel's managed Next.js output; the repository defines no custom output directory.
11. Select Node.js 22.x or another offered version satisfying `package.json` engine `>=22.13.0`; document the exact chosen runtime.
12. Configure deployments so unrelated branches do not become the stable staging deployment. Preview deployments should be limited to approved branch/testing needs.
13. Do not connect a production domain or label this as production. Vercel may call the stable environment “Production” inside this dedicated project; operationally it remains TotalScope staging.
14. Review current Vercel pricing/limits before creation.

The repository contains no `vercel.json`; use standard Next.js behavior unless a later approved change adds configuration.

## 14. Vercel Environment Configuration

**HOSTED WRITE — APPROVAL REQUIRED: adding Vercel environment values.**

Add only:

```text
TOTALSCOPE_DATA_MODE=live
TOTALSCOPE_DEPLOYMENT_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=<STAGING_PROJECT_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>
```

For the stable branch deployment, scope these to the staging project's stable environment. If previews are authorized, add branch-scoped Preview values pointing to the same staging project only after considering whether concurrent previews should share data.

Never add:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_URL` for importer use;
- database passwords;
- database connection strings;
- `TOTALSCOPE_IMPORT_TARGET`;
- source workbooks;
- user passwords.

Environment changes require a new deployment to affect the built application. Before deployment:

1. Review variable names character-for-character.
2. Confirm no service-role variable exists in Vercel.
3. Confirm the public URL belongs to the approved staging project.
4. Run `npm test`; the C2 security suite statically checks application/client sources for service-role references.
5. After deployment, inspect browser-delivered source/network configuration for the public anon key only. Do not search by printing the service-role secret; verify by variable inventory and source/test evidence.

## 15. First Vercel Deployment

1. **STOP GATE:** hosted Supabase project identity approved.
2. **VALIDATION:** both migrations present in remote history.
3. **VALIDATION:** Auth provider and signup policy configured.
4. **VALIDATION:** first import, validation, idempotency import, and second validation passed.
5. **VALIDATION:** four allowed Vercel variables configured; prohibited secrets absent.
6. **HOSTED WRITE — APPROVAL REQUIRED:** trigger the first stable deployment of the staging branch.
7. Monitor install, typecheck/build output, and runtime startup. Stop on warning/error that affects security or correctness.
8. Record the deployment ID and stable URL without credentials.
9. Request:

   ```text
   https://<STAGING_HOST>/api/health
   ```

   Require HTTP 200 with only coarse `app`, `configuration`, and `database` statuses.
10. **HOSTED WRITE — APPROVAL REQUIRED:** update Supabase Auth Site URL and approved redirect URLs to the stable staging URL.
11. If environment or Auth URL configuration changed, **HOSTED WRITE — APPROVAL REQUIRED:** redeploy if required.
12. Run the hosted acceptance checklist only after Michael approves hosted browser testing.

## 16. Hosted Acceptance Checklist

Record pass/fail, timestamp, tester, deployment ID, and sanitized evidence for each item.

### Signed-out behavior

- [ ] `/` shows the public landing experience and does not expose live claim data.
- [ ] `/dashboard` redirects to `/login`.
- [ ] `/claims` redirects to `/login`.
- [ ] A real `/claims/<CLAIM_UUID>` URL redirects to `/login`.
- [ ] `/admin/imports/q2-2026` redirects to `/login`.
- [ ] Redirect retains a safe relative `next` path where implemented.

### Authentication

- [ ] Viewer sign-in succeeds.
- [ ] Staging-admin sign-in succeeds.
- [ ] Invalid password returns the generic error and leaks no provider detail.
- [ ] Refresh retains the session.
- [ ] Subsequent protected navigation retains the session.
- [ ] Sign-out returns to login.
- [ ] After sign-out, direct protected URLs are denied.

### Viewer access

- [ ] Dashboard renders live mode.
- [ ] Expected Q2 total of 214 claims appears.
- [ ] Claims Explorer renders.
- [ ] Search, sorting, pagination, and links behave as implemented.
- [ ] Claim detail renders approved financial facts and matched updates.
- [ ] Provenance is sanitized; workbook hash/import-job internals are absent.
- [ ] Raw source JSON is not visible or queryable.
- [ ] Admin validation redirects to `/dashboard?access=denied`.
- [ ] Profile update/self-elevation is denied.

### Staging-admin access

- [ ] Dashboard and claims render.
- [ ] `/admin/imports/q2-2026` renders.
- [ ] Approved import job, validation counts, and grouped quality issues are visible.
- [ ] Raw source JSON, aliases, people tables, unrestricted staging rows, and mutation RPCs remain blocked.

### Database security

- [ ] Run the viewer RLS probe against hosted staging only after explicit approval.
- [ ] Approved claim read succeeds.
- [ ] `source_rows.raw_row` read fails.
- [ ] Viewer validation-view read fails.
- [ ] Viewer profile mutation fails.
- [ ] Controlled service-role promotion succeeds only through the approved administration path.
- [ ] Promoted staging admin can read validation.
- [ ] Temporary probe user is removed after evidence capture.

The repository script is:

```powershell
npm run test:c2-db
```

It creates and deletes a temporary Auth user and therefore is a **HOSTED WRITE — APPROVAL REQUIRED** operation when pointed at hosted staging.

### Importer

- [ ] First import completed 81 batches.
- [ ] First validation matched every canonical count.
- [ ] Second import completed without duplicate canonical rows.
- [ ] Second validation matched.
- [ ] Same logical import job was reused.

### Operational checks

- [ ] `/api/health` returns HTTP 200 and coarse statuses only.
- [ ] Build logs contain no secrets.
- [ ] Runtime logs contain no credentials, source rows, or stack traces exposed to users.
- [ ] Browser bundles contain no service-role variable/key.
- [ ] Expected failures return generic, acceptable UI.
- [ ] No production resource, domain, credential, user, or dataset was touched.

## 17. Evidence Capture

Create a future repository document:

`docs/milestones/c2-1-hosted-staging-evidence.md`

Do not commit it until review and explicit approval. Store:

- staging URL;
- Supabase project reference, not keys;
- Vercel project/deployment ID and URL;
- branch and deployed commit;
- remote migration history summary;
- importer version and source checksum;
- first/second validation summaries and canonical counts;
- logical import-job ID comparison;
- completed acceptance checklist;
- secret-free screenshots of login, dashboard, Claims Explorer, claim detail, viewer admin denial, and admin validation;
- RLS probe outcome;
- temporary-user cleanup state;
- health response status;
- test/typecheck/lint/build results;
- known issues and accepted risks;
- final Git status.

Redact user email addresses if they are not needed. Never include passwords, tokens, keys, cookies, headers, connection strings, raw source data, or private logs.

## 18. Rollback Plan

### Vercel

- Stop further deployments and preserve the failed deployment/log evidence.
- Remove or disable public access to the staging deployment using the team's approved controls.
- Restore prior environment configuration only after separate approval.
- Redeploy the last known good C2 commit if one exists.
- Disconnect/delete the staging project only with explicit destructive-action approval.

### Hosted Supabase

- Stop imports and user testing.
- Preserve migration history, import status, validation output, and sanitized logs.
- Disable/remove temporary test users after separate approval.
- Do not reverse migrations with ad hoc SQL.
- Prefer creating a newly approved disposable staging project and replaying validated migrations/import if recovery requires a clean database.
- Switching Git commits does not undo hosted migrations.
- Project deletion, table truncation, import deletion, and user deletion are destructive and require their own explicit approval.

### Git

- Keep `feature/c2-staging-foundation`.
- Do not merge into `main` during recovery.
- Inspect C1 safely:

  ```powershell
  git switch --detach 0eb1ea5c2bec8433bf672b3c899382a8a6f81971
  ```

- Create a recovery branch without deleting C2:

  ```powershell
  git switch -c recovery/c1-staging-review 0eb1ea5c2bec8433bf672b3c899382a8a6f81971
  ```

- If C2 is later merged, a reviewed `git revert` may be appropriate. Do not run destructive resets or force pushes.

## 19. Failure Scenarios and Stop Conditions

For every condition below: **stop, preserve secret-free evidence, do not improvise, and report before continuing.**

| Condition | Required response |
|---|---|
| Remote migration history differs from expected | Do not push; capture `migration list` and dry-run output |
| C1 migration has changed | Stop all hosted work; compare with C1 commit |
| Environment value or target is ambiguous | Do not build/import; have Michael re-identify the staging project |
| Service-role key appears in browser/Vercel | Disable affected deployment, rotate exposed key through approved process, preserve evidence |
| Viewer RLS probe fails | Stop acceptance and deployment promotion; do not widen grants |
| Viewer accesses admin validation | Stop; preserve request/role evidence; investigate server and database layers |
| First import count mismatch | Stop before idempotency run; preserve batch/validation output |
| Second import adds duplicates or changes counts | Stop; preserve both validation reports and job identities |
| Wrong workbook selected/checksum mismatch | Stop; do not use checksum override |
| Wrong Supabase project targeted | Stop before command; if already written, halt and escalate without deleting |
| Importer reports production-like host | Stop; never bypass the guard |
| Vercel build fails | Preserve build log, do not weaken validation to deploy |
| Auth redirect loop | Stop browser acceptance; inspect exact Site URL/redirect configuration |
| Session is lost on refresh | Stop acceptance; preserve browser path and non-secret logs |
| Unexpected hosted cost/upgrade prompt | Stop creation or operation and have Michael review pricing/limits |
| Dependency advisory materially affects staging | Stop deployment; document reachability and remediation decision |

## 20. Dependency Advisory Review Gate

The current C2 completion report records five npm high-severity package entries:

| Package | Relationship |
|---|---|
| `next@15.5.21` | Direct; audit aggregates affected `postcss`/`sharp` paths |
| `postcss@8.4.31` | Transitive through Next |
| `sharp@0.34.5` | Transitive/optional through Next |
| `js-yaml@4.1.1` | Transitive development path through ESLint configuration |
| `brace-expansion@1.1.14` | Transitive development path through ESLint/minimatch |

Before hosted resource creation:

1. Rerun `npm audit --json` read-only.
2. Identify whether each vulnerable behavior is reachable in build time, server runtime, or browser runtime.
3. Confirm direct versus transitive status and installed version.
4. Identify a supported fixed version from authoritative package/framework guidance.
5. Determine whether remediation is breaking and requires a separate code milestone.
6. Record one decision: remediate first, proceed with time-bounded documented staging risk, or stop C2.1.
7. Do not run `npm audit fix`, `npm audit fix --force`, or an automatic downgrade.

This gate must be approved before creating or deploying hosted staging.

## 21. Cost and Resource Controls

- Review current authoritative Supabase and Vercel pricing at setup time; this plan quotes no prices.
- Choose the lowest tier that supports the required staging database, Auth, deployment, and acceptance work.
- Create one Supabase staging project and one Vercel staging project only.
- Do not enable production-grade paid add-ons, custom domains, observability packages, or scaling features without separate approval.
- Limit data to the single validated Q2 workbook.
- Limit users to the administrator and necessary acceptance viewer/test identities.
- Set budget/usage alerts where the selected services support them.
- Review usage after import and browser acceptance.
- Pause or remove abandoned resources only after verifying exact targets and obtaining explicit approval.
- Never delete a project merely to resolve uncertainty; first preserve evidence and confirm recovery needs.

## 22. Approval Gates

Approval for one gate does not imply approval for any later gate.

| Gate | Action | Approval owner |
|---:|---|---|
| 1 | Accept advisory review decision and create hosted Supabase staging | Michael |
| 2 | Link the local repository to the exact hosted Supabase project | Michael |
| 3 | Apply C1 and C2 migrations | Michael |
| 4 | Create the initial hosted Auth user | Michael |
| 5 | Assign `staging_admin` | Michael |
| 6 | Run the first hosted Q2 import | Michael |
| 7 | Run the hosted idempotency import | Michael |
| 8 | Create the Vercel staging project | Michael |
| 9 | Add four approved Vercel environment variables | Michael |
| 10 | Trigger the first Vercel staging deployment | Michael |
| 11 | Change Supabase Auth Site URL/redirect URLs | Michael |
| 12 | Perform hosted browser and RLS tests | Michael |
| 13 | Clean up temporary hosted test users/resources | Michael |
| 14 | Stage and commit the C2.1 evidence report | Michael |
| 15 | Merge C2/C2.1 into `main` | Michael; separate post-acceptance decision |

## 23. Exact Execution Order

1. **LOCAL READ-ONLY** Confirm branch, HEAD, clean tree, C1 integrity, migration files, workbook ignore, and source checksum.
2. **VALIDATION** Rerun tests, typecheck, lint, build, and `git diff --check`.
3. **STOP GATE** Complete dependency advisory review and approve a proceed/stop decision.
4. **MICHAEL MANUAL** Confirm Supabase/Vercel organizations, permissions, staging names, tiers, region, and secret manager.
5. **HOSTED WRITE — APPROVAL REQUIRED** Create one Supabase staging project.
6. **MICHAEL MANUAL** Securely record project reference, public values, and server-only secrets.
7. **HOSTED WRITE — APPROVAL REQUIRED** Configure email/password Auth and disable public signup.
8. **STOP GATE** Verify the project is unmistakably staging.
9. **HOSTED WRITE — APPROVAL REQUIRED** Link the repository.
10. **LOCAL READ-ONLY** Run remote migration list and database push dry run.
11. **STOP GATE** Require exactly the C1 and C2 migrations.
12. **HOSTED WRITE — APPROVAL REQUIRED** Apply migrations.
13. **VALIDATION** Verify migration history, database objects, grants, functions, and RLS.
14. **HOSTED WRITE — APPROVAL REQUIRED** Create the initial user and confirm its default viewer profile.
15. **HOSTED WRITE — APPROVAL REQUIRED** Promote the verified UUID to `staging_admin`.
16. **HOSTED WRITE — APPROVAL REQUIRED** Create the viewer acceptance identity.
17. **LOCAL READ-ONLY** Verify workbook filename, ignore state, checksum, and 81-batch plan.
18. **STOP GATE** Confirm hosted target URL/reference and load secrets without printing.
19. **HOSTED WRITE — APPROVAL REQUIRED** Run first import.
20. **VALIDATION** Validate all canonical counts.
21. **STOP GATE** Approve idempotency run only after first validation passes.
22. **HOSTED WRITE — APPROVAL REQUIRED** Run second import.
23. **VALIDATION** Revalidate counts and same logical import job.
24. **HOSTED WRITE — APPROVAL REQUIRED** Create dedicated Vercel staging project from the feature branch.
25. **HOSTED WRITE — APPROVAL REQUIRED** Add only the four approved Vercel variables.
26. **STOP GATE** Confirm no service-role/database/importer secret is present.
27. **HOSTED WRITE — APPROVAL REQUIRED** Trigger the first deployment.
28. **VALIDATION** Check build logs, stable URL, and `/api/health`.
29. **HOSTED WRITE — APPROVAL REQUIRED** Set exact Supabase Site URL and allowed redirect URLs.
30. **HOSTED WRITE — APPROVAL REQUIRED** Redeploy if configuration changes require it.
31. **HOSTED WRITE — APPROVAL REQUIRED** Run browser and hosted database security acceptance.
32. **VALIDATION** Complete every pass/fail checklist item and preserve secret-free evidence.
33. **HOSTED WRITE — APPROVAL REQUIRED** Remove temporary test users after evidence capture, if approved.
34. **LOCAL READ-ONLY** Draft `docs/milestones/c2-1-hosted-staging-evidence.md`.
35. **STOP GATE** Review evidence, accepted risks, costs, and remaining issues.
36. **STOP GATE** Obtain separate approval before staging, committing, or pushing the evidence report.
37. **STOP GATE** Decide later whether to merge into `main`; do not infer approval.

## 24. Definition of Done

C2.1 is complete only when:

- [ ] one isolated hosted Supabase staging project exists;
- [ ] both unchanged migrations are applied successfully;
- [ ] the checksum-validated Q2 dataset is imported;
- [ ] the second import is idempotent and uses the same logical import job;
- [ ] every canonical count matches;
- [ ] viewer and staging-admin accounts work;
- [ ] viewer denial, raw-column denial, self-elevation denial, and admin access are verified;
- [ ] one dedicated Vercel staging project is deployed from the approved branch;
- [ ] `/api/health` passes without leaking internals;
- [ ] hosted browser acceptance passes;
- [ ] service-role/database/user secrets remain protected;
- [ ] secret-free evidence is documented and reviewed;
- [ ] temporary users are cleaned up as approved;
- [ ] no production resource was touched;
- [ ] no merge into `main` occurred without separate approval.

## 25. Recommended Follow-On Milestone

After C2.1 evidence is accepted, the recommended follow-on is **C3 Historical Master Dataset**.

Repository architecture already anticipates additional approved source periods, provenance, identity resolution, quality review, and longitudinal metrics. C3 should begin with a source inventory and canonical import plan for approved historical files—not with speculative analytics or direct bulk import. It should preserve C1/C2 security boundaries and add datasets only after audit, mapping, count definitions, and acceptance criteria are approved.

Do not begin C3 until C2.1 hosted evidence is complete and Michael has separately approved scope.
