# C2.1 Hosted Staging Completion Report

## Objective

C2.1 moved the validated C1 vertical slice into a permanent, isolated hosted staging environment. It preserved the C1 data model and Q2 2026 acceptance counts while adding authentication, authorization, deployment controls, operational health, and browser-verified role boundaries.

Detailed capture evidence is recorded in [`evidence/c2-1-post-deployment-evidence.md`](evidence/c2-1-post-deployment-evidence.md).

## Completed Scope

- Created one Supabase Free-tier staging project in `us-east-1`; no production-like project was used.
- Applied the three ordered migrations for the C1 foundation, C2 security model, and constrained administrator validation RPC.
- Configured email/password Auth with public registration disabled.
- Created one active staging administrator and one temporary viewer profile.
- Imported only the approved Q2 2026 workbook through the explicit administrative importer.
- Proved two-pass idempotency: one import job, unchanged source/canonical counts, and zero duplicate keys.
- Deployed the approved feature branch to the permanent Vercel staging project.
- Configured the stable staging Auth origin and explicit redirect.
- Completed administrator, viewer, signed-out, session-persistence, and claim-detail browser acceptance.
- Added and accepted persistent dark/light theme selection.
- Corrected the administrator validation path without broadening base-table permissions.

## Hosted Architecture

The browser uses the public Supabase project URL and anon key with an authenticated session. Route guards require a valid profile, and administrator routes additionally require an active `staging_admin` profile. RLS remains enabled on all 17 application tables, with forced RLS on `application_profiles` and 11 scoped policies.

The service role remains importer/server-only and is absent from Vercel. Raw workbook payloads and restricted update fields are not exposed through browser-facing grants. The administrator validation page uses the aggregate-only `public.get_q2_2026_import_validation()` security-definer RPC with an empty `search_path`, explicit active-admin checks, and no raw or PII return fields.

## Migration and Data Result

Hosted migration order:

1. `202607230001_c1_q2_2026_foundation.sql`
2. `202607230002_c2_staging_security.sql`
3. `202607240001_c2_admin_validation_surface.sql`

Final hosted data:

- 1 import job, 1 source file, 2 worksheets, and 7,678 source rows;
- 214 staged and canonical claims;
- 148 staged subitem headers and 1,359 details;
- 100 organizations and 100 aliases;
- 3 people and 3 aliases;
- 1,284 financial facts and 214 derived metrics;
- 5,957 claim updates with 5,957 unique post IDs;
- 177 complete and 37 closed claims; and
- 183 explicit data-quality issues.

The import finished `completed_with_warnings`. Fifty-eight update rows representing 56 item IDs do not match the archive claim set and are deliberately quarantined. There are no duplicate claim keys, source coordinates, or update keys, and no required-field promotion failures.

## Authentication and Deployment

The hosted project has two Auth users and two linked profiles: one permanent staging administrator and one temporary viewer. Self-registration is disabled, profile creation is trigger-backed, viewer self-elevation is denied, and browser acceptance confirmed the intended route and data boundaries.

Vercel project `totalscope-intelligence-staging` is Ready at `https://totalscope-intelligence-staging.vercel.app`, tracking `feature/c2-staging-foundation` and deployed at commit `7bfab0e05e3d91a4d2d585b265c9764f65daa2a6`. Only the four approved environment-variable names are present. No service-role credential, workbook, database password, production deployment, custom domain, or DNS change exists.

## Defects Discovered and Corrected

Two validation-interface defects were isolated and corrected:

1. The application initially selected fields that were not authorized by the intended validation contract.
2. The security-invoker validation view still required underlying access that should not be broadly granted to browser users.

The final solution preserved base-table restrictions and introduced an aggregate-only administrator RPC with explicit identity and role checks. The deployed interface and viewer-denial behavior passed browser acceptance.

The light-mode request was implemented separately with dark mode retained, persisted browser preference, accessible labeling and focus states, and no hydration warning.

## Verification Summary

- Hosted health: application, configuration, and database all successful.
- Migration history: 3/3, ordered, no drift or repair.
- Import idempotency: passed.
- Database security probe: passed.
- Focused security tests: 9/9.
- Relevant import/route tests: 8/8.
- Full automated tests: 17/17.
- TypeScript, ESLint, production build, schema lint, and `git diff --check`: passed.
- Administrator, viewer, signed-out, claims, validation, session, logout, and light-mode browser acceptance: passed.

## Known Risks

The private staging environment remains **Ready with documented risk**:

- five high-severity npm advisory paths remain open; no `npm audit fix` was run;
- dependency remediation and reassessment are required before production readiness;
- the environment validator lacks a repository-wide invocation point;
- an older runbook omits the authoritative workbook filename's ` (1)` suffix;
- the temporary viewer should be retained or removed only through a separately approved hosted action;
- the 58 known orphan source updates remain quarantined for later source-owner review; and
- custom domain, DNS, production deployment, additional datasets, and C3 work remain deferred.

These items do not block private staging or a controlled merge. They do block any inference that the system is production-ready.

## Operational Status

The feature branch is deployed, healthy, synchronized with its remote, and backed by the intended isolated staging database. Merging the branch does not itself execute database migrations or imports. The current Vercel project tracks the feature branch rather than `main`, so a merge is not expected to deploy this staging project automatically. That branch-tracking setting should be reconfirmed immediately before merge.

## Merge-Readiness Recommendation

**Ready to merge with documented risk**

Functional, data, security, operational, and repository acceptance have passed. The recommendation is qualified by the documented dependency advisories, missing global environment-validator invocation, known quarantined source orphans, and deferred production controls. No production deployment should be authorized from this assessment.

