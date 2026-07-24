# C2.1 Hosted Staging - Post-Deployment Evidence

## 1. Purpose

This document records the validated state of the permanent, isolated TotalScope Intelligence hosted staging environment after:

- creation of the permanent Supabase staging project;
- application of the canonical schema and staging-security migrations;
- staging Auth configuration;
- the controlled two-pass Q2 2026 import;
- importer idempotency verification;
- deployment to Vercel staging;
- administrator and viewer browser acceptance;
- correction and deployment of the secure administrator validation surface; and
- deployment and acceptance of persistent light mode.

This is staging evidence, not production certification. No production resource is represented here.

## 2. Capture Metadata

| Field | Captured value |
|---|---|
| Capture time | 2026-07-24 11:07:04 EDT (`UTC-04:00`) |
| UTC capture time | 2026-07-24 15:07:04 UTC |
| Repository branch | `feature/c2-staging-foundation` |
| Repository HEAD at capture | `7bfab0e05e3d91a4d2d585b265c9764f65daa2a6` |
| Local/remote synchronization | Passed; local HEAD and `origin/feature/c2-staging-foundation` matched |
| Working tree | Clean; no `.env.local` or `.vercel` artifacts |
| Supabase project | `totalscope-intelligence-staging` |
| Supabase reference | `ygeahqczlrwaadvlsiew` |
| Supabase region | East US (North Virginia), `us-east-1` |
| Supabase tier | Free / nano |
| Vercel project | `totalscope-intelligence-staging` |
| Stable staging URL | `https://totalscope-intelligence-staging.vercel.app` |
| Deployed commit | `7bfab0e05e3d91a4d2d585b265c9764f65daa2a6` |
| Deployment status | Ready |
| Environment classification | Permanent isolated staging; not production |

No password, token, key, private connection string, full user email address, raw workbook row, or customer PII is included.

## 3. Repository History

The approved C2/C2.1 sequence is linear and present on the feature branch:

| Order | Commit | Message |
|---:|---|---|
| 1 | `7cea2a2` | `feat: add secure staging foundation` |
| 2 | `ac8dc48` | `docs: add C2 completion report` |
| 3 | `f2b66e7` | `docs: add c2.1 hosted staging execution plan` |
| 4 | `b1c4102` | `docs: add C2.1 pre-import baseline evidence` |
| 5 | `39df12d` | `feat: add persistent light mode` |
| 6 | `9663842` | `fix: use authorized import validation fields` |
| 7 | `7bfab0e` | `fix: add secure admin validation surface` |

The branch was seven commits ahead of `main` at capture. No amend, squash, rebase, or history rewrite was performed during evidence capture.

## 4. Hosted Migration Baseline

The linked local and hosted histories contain exactly three versions in the same order:

| Order | Version | Local filename | SHA-256 | Purpose | Result |
|---:|---|---|---|---|---|
| 1 | `202607230001` | `202607230001_c1_q2_2026_foundation.sql` | `5430cd056649e56a0e69e5abeac97c8241acd9ffe459cc80dcf9b933e59a372d` | C1 canonical Q2 schema, provenance, importer, validation, and integrity controls | Pass |
| 2 | `202607230002` | `202607230002_c2_staging_security.sql` | `5bd1f58469ff24608dee95161a936bdfd7c5fb440b9b905ac3c8511163ee02e8` | Application profiles, Auth integration, grants, RLS, and staging security | Pass |
| 3 | `202607240001` | `202607240001_c2_admin_validation_surface.sql` | `e49bc03b73f5277dc3dd91269dc970ac93b9798363b579737b1b41ac47bcc7ce` | Constrained aggregate validation RPC for active staging administrators | Pass |

Migration count is three. The two originally approved migration checksums remain unchanged. Local and hosted versions match one-to-one, with no drift, repair entry, duplicate version, gap, or ordering ambiguity.

## 5. Hosted Data Baseline

The pre-import values come from the approved pre-import baseline. The first and second import columns record the two-pass validation evidence. The final column was reconfirmed read-only in the hosted project.

| Measure | Pre-import | After first import | After second import | Final hosted | Expected final | Result |
|---|---:|---:|---:|---:|---:|---|
| Import jobs | 0 | 1 | 1 | 1 | 1 | Pass |
| Source files | 0 | 1 | 1 | 1 | 1 | Pass |
| Source worksheets | 0 | 2 | 2 | 2 | 2 | Pass |
| Source rows | 0 | 7,678 | 7,678 | 7,678 | 7,678 | Pass |
| Staged claims | 0 | 214 | 214 | 214 | 214 | Pass |
| Staged subitem headers | 0 | 148 | 148 | 148 | 148 | Pass |
| Staged subitem details | 0 | 1,359 | 1,359 | 1,359 | 1,359 | Pass |
| Organizations | 0 | 100 | 100 | 100 | 100 | Pass |
| Organization aliases | 0 | 100 | 100 | 100 | 100 | Pass |
| People | 0 | 3 | 3 | 3 | 3 | Pass |
| Person aliases | 0 | 3 | 3 | 3 | 3 | Pass |
| Claims | 0 | 214 | 214 | 214 | 214 | Pass |
| Financial facts | 0 | 1,284 | 1,284 | 1,284 | 1,284 | Pass |
| Derived metrics | 0 | 214 | 214 | 214 | 214 | Pass |
| Claim updates | 0 | 5,957 | 5,957 | 5,957 | 5,957 | Pass |
| Data-quality issues | 0 | 183 | 183 | 183 | 183 | Pass |
| Complete claims | 0 | 177 | 177 | 177 | 177 | Pass |
| Closed claims | 0 | 37 | 37 | 37 | 37 | Pass |
| Duplicate claim keys | 0 | 0 | 0 | 0 | 0 | Pass |
| Duplicate source coordinates | 0 | 0 | 0 | 0 | 0 | Pass |
| Duplicate update keys | 0 | 0 | 0 | 0 | 0 | Pass |
| Unmatched/orphan source update rows | 0 | 58 | 58 | 58 | 58 quarantined | Pass |
| Unique unmatched source item IDs | 0 | 56 | 56 | 56 | 56 quarantined | Pass |
| Required-field promotion failures | 0 | 0 | 0 | 0 | 0 | Pass |

The 58 unmatched update rows are known source-quality findings, not duplicate canonical keys or silent failures. They represent 56 source item IDs outside the archive claim set and remain explicitly quarantined/reviewable. The hosted import status is `completed_with_warnings`.

Financial reconciliation also remained stable: 213 exact additional-RCV relationships, zero tolerance-only matches, zero mismatches, and one claim with a missing component.

## 6. Idempotency Evidence

| Item | Evidence |
|---|---|
| Authoritative workbook filename | `Archive_Q2_2026_1784837413 (1).xlsx` |
| Sanitized local path | `data/source/Archive_Q2_2026_1784837413 (1).xlsx` |
| Workbook SHA-256 | `8c25be883993f821e6deff6a6aa787d30ee9d794b5cf7fe73a41b58c67f06323` |
| Worksheets | `archive q2 2026`; `updates` |
| Source rows | 7,678 |
| Import job | `f37ebd53-****-****-****-********7f89` |
| Run fingerprint | `37145e90...7566be2` |
| First import status | `completed_with_warnings` |
| Second import behavior | Deterministic reuse of the existing import job |
| Import-job count after rerun | 1 |
| Canonical and source counts after rerun | Unchanged |
| Duplicate canonical/source/update keys | 0 / 0 / 0 |
| Manual repair | None |

The second pass did not create a second job, duplicate source rows, or duplicate canonical records. No migration repair, data repair, or manual SQL correction was used.

## 7. Authentication and Role Evidence

- Email/password authentication is enabled.
- Public self-registration and anonymous sign-in are disabled.
- Password policy requires at least 12 characters with lowercase, uppercase, numeric, and symbol composition; secure password-change checks are enabled.
- Hosted Auth users: 2.
- Application profiles: 2.
- Active roles: one `staging_admin` and one temporary `viewer`.
- The Auth-user profile trigger successfully created one linked profile per user.
- There are no missing, orphaned, or duplicate profiles.
- Viewer self-elevation was denied by privileges, RLS, and the immutable role boundary.
- The administrator account passed active-profile and `staging_admin` validation.
- No full email address, user UUID, or password is recorded in this evidence.

The viewer is intentionally temporary; its disposition is deferred to a separately approved hosted operation.

## 8. Security Architecture Evidence

### Database boundaries

| Control | Observed state | Result |
|---|---:|---|
| RLS-enabled application tables | 17 | Pass |
| Forced-RLS tables | 1 (`application_profiles`) | Pass |
| RLS policies | 11 | Pass |
| Anonymous access to protected data | Denied | Pass |
| Viewer access | Limited to approved claim surfaces and own profile | Pass |
| Administrator access | Limited by authenticated active-admin predicates and scoped grants | Pass |
| Service-role separation | Server/importer-only | Pass |
| Service-role variable in Vercel | Absent | Pass |
| Raw source payload exposed to browser roles | No | Pass |
| Unmatched/restricted `claim_updates` exposed to viewers | No | Pass |
| Base-table grants broadened by validation correction | No | Pass |

Normal browser access uses the Supabase anon key plus the authenticated user session. Import and administrative service-role capabilities remain outside Vercel and browser code.

### Administrator validation surface

The final administrator interface calls `public.get_q2_2026_import_validation()`. Its controls are:

- `SECURITY DEFINER`;
- owned by `postgres`;
- fixed empty `search_path`;
- explicit authenticated-user and active-`staging_admin` checks;
- execution revoked from `PUBLIC` and `anon`;
- execution granted only to the documented authenticated role;
- an explicit 15-field aggregate return shape; and
- no raw payload, customer PII, unrestricted JSON, source row bodies, or restricted update fields.

The RPC resolves the browser-facing aggregate-validation need without weakening the underlying table RLS policies or grants.

## 9. Vercel Deployment Evidence

| Field | Observed value |
|---|---|
| Project | `totalscope-intelligence-staging` |
| Stable URL | `https://totalscope-intelligence-staging.vercel.app` |
| Linked GitHub branch | `feature/c2-staging-foundation` |
| Deployed commit | `7bfab0e05e3d91a4d2d585b265c9764f65daa2a6` |
| Status | Ready |
| Framework | Next.js 15 |
| Project root | Repository root |
| Install/build | npm lockfile install and Next.js production build |

Expected environment-variable names are present in both Preview and Production scopes:

| Name | Classification |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe public project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe public anon key |
| `TOTALSCOPE_DATA_MODE` | Non-secret server/application mode selector |
| `TOTALSCOPE_DEPLOYMENT_ENV` | Non-secret server/application environment selector |

No service-role variable, database password, workbook path, or private connection string exists in Vercel. Supabase Auth uses the stable staging origin as its Site URL and an explicit staging redirect entry. No wildcard redirect, custom domain, DNS change, production deployment, or `main` deployment was introduced.

## 10. Browser Acceptance Matrix

| Acceptance check | Result |
|---|---|
| Signed-out route protection | Pass |
| Administrator sign-in | Pass |
| Administrator refresh/session persistence | Pass |
| Executive dashboard | Pass |
| Claims Explorer | Pass |
| Claim detail | Pass |
| Updates and sanitized source lineage | Pass |
| Administrator validation page | Pass |
| Validation warning status | Pass - `completed_with_warnings` shown |
| Raw-field denial | Pass |
| Administrator sign-out | Pass |
| Viewer sign-in | Pass |
| Viewer refresh/session persistence | Pass |
| Viewer dashboard | Pass |
| Viewer Claims Explorer | Pass |
| Viewer claim detail | Pass |
| Viewer administrator-route denial | Pass - redirected with access denied |
| Viewer validation-interface denial | Pass |
| Viewer restricted-field denial | Pass |
| Viewer role-mutation denial | Pass |
| Viewer sign-out | Pass |
| Protected-route denial after sign-out | Pass |

## 11. Light-Mode Acceptance

| Acceptance check | Result |
|---|---|
| Landing page | Pass |
| Login page | Pass |
| Authenticated pages | Pass |
| Dark mode availability and default | Pass |
| Light-mode toggle | Pass |
| Preference persistence | Pass |
| Persistence across navigation | Pass |
| Keyboard accessibility | Pass |
| Visible focus styling | Pass |
| Accessible toggle naming | Pass |
| Hydration behavior | Pass - no mismatch warning observed |
| Responsive/mobile behavior | Pass |

The preference is browser-local, safe to access only after client initialization, and does not carry identity or sensitive information.

## 12. Validation Results

| Validation | Result |
|---|---|
| Clean local migration application | Pass; all 3 migrations present after reset |
| Local Q2 import | Pass; 81 batches with count-gated finalization |
| Schema lint | Pass; no errors |
| Database security probe | Pass |
| Focused security tests | Pass; 9/9 |
| Import/route tests | Pass; 8/8 |
| Full test suite | Pass; 17/17 |
| TypeScript validation | Pass |
| ESLint | Pass |
| Production build | Pass |
| `git diff --check` | Pass |

The local reset command wrapper exceeded its observation window after approximately 184 seconds, but the resulting migration history and subsequent database checks confirmed that all three migrations applied and the test/import sequence completed successfully.

## 13. Known Risks and Deferred Items

### Non-blocking for private staging and merge

- Five high-severity npm advisory paths remain documented:
  1. direct `next@15.5.21`, aggregating affected bundled paths;
  2. transitive `postcss@8.4.31` through Next;
  3. transitive/optional `sharp@0.34.5` through Next;
  4. transitive development `js-yaml@4.1.1` through ESLint configuration; and
  5. transitive development `brace-expansion@1.1.14` through ESLint/minimatch.
- Dependency posture remains **Ready with documented risk** for private staging. No `npm audit fix` was run. Dependency remediation/reassessment is a production-readiness gate.
- `validateApplicationEnvironment()` still has no repository-wide invocation point. Current staging health and build checks pass, but production should enforce fail-fast validation globally.
- The authoritative importer workbook includes ` (1)` in its filename; an older staging runbook omits that suffix.
- The 58 unmatched update rows and 56 unmatched item IDs are retained as known, quarantined source-quality findings.
- The temporary viewer-account disposition is deferred.
- Custom domain and DNS work are deferred.
- Production deployment and production credentials are deferred.
- Additional quarters, broader analytics, and other C3/future scope remain unapproved.

### Blocking

No defect blocks continued use of the private hosted staging environment or merging this feature branch. The dependency and global environment-validation items must be resolved or explicitly re-approved before production readiness.

## 14. Hosted Integrity Conclusion

- No unexpected data mutation was observed.
- No duplicate canonical claim, source-coordinate, or update key was created.
- Auth-user and profile counts remain 2/2, with one administrator and one viewer.
- No production resource was touched.
- No secret exposure was observed.
- No broad permission expansion was introduced.
- No additional workbook or quarter was imported.
- The stable health endpoint reports application, configuration, and database status as successful.

**Post-deployment evidence passed with documented risk**

