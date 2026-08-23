# TotalScope Intelligence Commercial Readiness Audit

**Audit date:** August 10, 2026
**Repository:** `msjbco/totalscope-intelligence`
**Branch:** `feature/c3-operations-mvp`
**Audited HEAD:** `d128d313e539ab4051ecd8cc5b945018120b4c8c`
**Scope:** Audit only. No remediation was performed.
**Assessment basis:** Tracked repository plus the current uncommitted working tree, including the uncommitted Client View, carrier, contractor, and weather foundation work.

> AI may write code. AI does not get to decide by itself that the code is production-worthy.

## Executive assessment

TotalScope Intelligence has a stronger technical foundation than a typical prototype. Its source-provenance model, explicit missing-financial-data semantics, deterministic ingestion controls, versioned analytics, service-role boundary, additive migrations, and staging discipline are worth preserving. The appropriate strategy is **incremental hardening**, not a rewrite.

It is **not commercially deployable for external customers today**. The principal blocker is structural: the implemented authorization model recognizes only `viewer` and `staging_admin`, and every active viewer can read every approved client, file, person, financial fact, invoice, and C1 claim exposed through browser-facing RLS. There is no user-to-client membership model and no tenant predicate in the policies. The schema contains `client_id` on several C3 tables, but this is not an enforced security boundary. A client user could retrieve another client's records through the Supabase API or guessed identifiers even if the UI hid those records.

The codebase is best described as a **validated internal staging platform with product-quality data foundations and prototype-quality commercial controls**. It should remain staging-only until the P0 and P1 backlog is closed and independently validated.

## Audit method and limitations

The audit inspected application source, route composition, server/client boundaries, Supabase clients, RLS migrations, grants, ingestion scripts, analytics services, tests, documentation, environment handling, deployment configuration, and package metadata. README claims were checked against implementation.

Commands executed:

- `npm test`: **67/67 passed**
- `npm run typecheck`: **passed**
- `npm run lint`: **passed**
- production `npm run build` with explicit local/demo environment: **passed**
- `git diff --check`: **passed**
- `npm audit --json`: **6 high-severity package findings, 0 critical**
- local Supabase status: **not available because Docker Desktop was not running**

The database-executing security probes in `tests/c2-database-security.mjs` and `tests/c3-database-security.mjs` were therefore not rerun. They are also not included by the default `npm test` glob. Hosted systems were not inspected or changed.

The working tree was already materially dirty before this audit. This report does not treat uncommitted work as a stable release checkpoint. Production readiness must ultimately be assessed against a clean, immutable commit.

## 1. Current architecture

### Application and Next.js

- Next.js 15 App Router with TypeScript and React 19.
- Route composition lives in `app/`; shared shell and analytical UI live in `components/`.
- Server Components are used for route entry points and live Supabase reads. Interactive dashboards and demo experiences use Client Components.
- `middleware.ts` delegates session refresh and coarse protected-route redirects to `lib/supabase/middleware.ts`.
- The only application API route is `app/api/health/route.ts`.
- There are no route-level `loading.tsx`, `error.tsx`, or `global-error.tsx` files.

### Data modes and environment boundaries

- `lib/data/config.ts` requires an explicit `TOTALSCOPE_DATA_MODE` of `demo` or `live`.
- staging and production-like deployments reject demo mode.
- browser reads use `NEXT_PUBLIC_SUPABASE_URL` and the anon key.
- importer scripts use server-side `SUPABASE_SERVICE_ROLE_KEY` and reject production-like targets.
- `.env*`, source workbooks, Supabase temp state, Vercel metadata, and artifacts are ignored.
- The environment boundary is intentionally fail-closed for the principal C1 live repositories; it does not silently fall back to demo data.

### Supabase and authentication

- Supabase email/password authentication with SSR cookie refresh.
- no public signup UI; profiles are created by an Auth trigger.
- application roles are `viewer` and `staging_admin`.
- service-role credentials are not referenced from application/browser source.
- administrator pages add server-side role guards, backed by database policies.

### Database and ingestion

- C1 models an audited Q2 Monday archive with immutable source files, worksheets, rows, claims, financial facts, derived facts, updates, import jobs, and quality issues.
- C2 adds profiles, RLS, browser-safe column grants, administrator validation, and health RPC.
- C3 adds a generalized ingestion ledger, canonical operational entities, financial events, lineage, and security-invoker browser views.
- the uncommitted weather migration adds a versioned weather source/event/revision foundation.
- Q2 import and C3 fixture import have explicit target confirmation and deterministic identities.

### Domain and calculations

- original demo calculations live in `lib/calculations.ts` and observations in `lib/observations.ts`.
- C3 calculations live in `lib/analytics/engine.ts` and the versioned KPI catalog in `lib/analytics/kpis.ts`.
- C3 operations routes consume a repository layer, but that layer is currently fixture-only.
- domain types are split between `types/intelligence.ts`, `types/live-intelligence.ts`, and `lib/analytics/types.ts`.

### Deployment and CI/CD

- Netlify configuration remains present in `netlify.toml`.
- Vercel staging is documented operationally but has no repository-level Vercel configuration.
- `.openai/hosting.json` contains no deployed Sites project.
- no `.github/workflows` or other CI configuration exists in the repository.

## 2. What should be preserved

1. **Explicit demo/live boundary.** `lib/data/config.ts` correctly rejects ambiguous data mode and prevents staging/production demo fallback.
2. **Server-only service-role boundary.** Application code uses anon + user JWT; importer credentials remain in explicit administrative scripts.
3. **Source provenance.** C1/C3 retain source hashes, source coordinates, parser/mapping versions, raw or protected payload references, and lineage.
4. **Missing-versus-zero semantics.** Financial availability enums and calculation coverage prevent absent money from becoming a plausible zero.
5. **Idempotent import design.** Unique fingerprints, source keys, immutable source records, retry attempts, and validation counts are substantially better than ordinary prototype importers.
6. **Additive migration discipline.** C2/C3 preserve earlier validated migrations rather than rewriting history.
7. **Security-invoker views and column grants.** These are good defense-in-depth mechanisms once tenant predicates are added.
8. **Versioned analytics.** Framework-independent analytics with configuration and KPI definitions are a sound boundary.
9. **Visible failure on principal live routes.** C1 dashboard and claims show errors rather than synthetic substitutes.
10. **Staging change discipline.** Existing runbooks, evidence, target confirmations, and manual approval gates are unusually strong for this maturity level.

## 3. Material architecture findings

### 3.1 Two data architectures coexist

The repository contains:

- the original nine-quarter synthetic model in `lib/demo-data.ts` and `lib/calculations.ts`;
- the C1 live archive repository in `lib/data/live-repository.ts`;
- the C3 canonical/analytics fixture repository in `lib/operations/demo-repository.ts`.

This is understandable during staged development, but it creates multiple sources of truth. For example, `/dashboard` and `/claims` switch between demo and live repositories, while `/operations`, `/operations/clients/*`, `/operations/files/*`, `/operations/handlers/*`, `/client-dashboard`, `/weather`, `/carriers`, and `/contractors` still use demo/fixture sources regardless of live mode. The UI labels most of this data as Demo Data, so it is not a silent false-live failure, but it is not a commercially coherent product architecture.

### 3.2 Large presentation components and global styling

- `components/product-vision/product-vision-demo.tsx` is approximately 1,148 lines and contains many presentation models, drill-down variants, and interaction branches.
- `app/globals.css` carries foundation, dashboard, Client View, weather, carrier, and contractor styling in highly compressed global selectors.
- `components/client-view/staffing-verification.tsx` is approximately 290 lines with workflow state and UI in one component.

These are not reasons to rewrite the system, but they materially increase regression risk and make ownership unclear. Demo-only code should stay isolated from commercial runtime bundles and styles.

### 3.3 Duplicate calculation/domain concepts

`lib/calculations.ts` and `lib/analytics/*` both calculate file counts, recovery/financial coverage, cycle time, and performance. Their types and metadata differ. The C3 engine is the stronger commercial boundary; the older calculation layer remains necessary for the original demo but should not become a second production source of truth.

### 3.4 UI components still calculate some presentation metrics

The C3 operational KPI routes generally consume evaluated KPIs, which is good. Newer demo components such as `components/dashboard/contractor-dashboard.tsx`, `components/dashboard/carrier-dashboard.tsx`, and `components/client-view/executive-client-portal.tsx` filter, aggregate, and format synthetic records directly. This is acceptable for an explicitly isolated demonstration, not for future live commercial results.

### 3.5 Encoding artifacts

Several source strings render mojibake such as `Â·`, `â†’`, and `Ã—` in application files. This indicates earlier encoding damage despite the LF policy. It is a UI quality issue and also makes source review/search less reliable.

## 4. Database and data-integrity findings

### Critical: tenant isolation is not implemented

The architecture documents prescribe immutable `tenant_id`, but the implemented schema uses `clients` without a tenant or account boundary. `application_profiles` has no client membership. RLS policies in `202607230002_c2_staging_security.sql` and `202607270004_c3_browser_interfaces.sql` use only `private.is_active_application_user()`, granting every active viewer access to all approved rows.

Examples:

- `active users read claims`
- `active users read clients`
- `active users read operational files`
- `active users read approved file financial facts`
- browser view `c3_operations_files` returns every client's files permitted by underlying active-user policies

This is appropriate only for trusted internal staging users. It violates the stated future requirement that one client never retrieve another client's information through direct Supabase queries, URL guessing, or developer tools.

### Critical: cross-client relational consistency is not enforced

Several rows repeat `client_id` alongside foreign keys without composite constraints proving they belong to the same client:

- `operational_files(client_id, branch_id)` does not enforce that `branch_id` belongs to `client_id`.
- `billing_invoices(client_id, operational_file_id)` does not enforce that the file belongs to the invoice client.
- payment and downstream events reference invoices/files independently without a tenant-consistency constraint.

An importer bug or future write path could create internally valid foreign keys that join records from different clients. RLS alone cannot repair corrupted ownership relationships.

### Strong integrity controls

- UUID primary keys are consistent.
- stable source identifiers and unique constraints support idempotency.
- money is represented in integer minor units in C3.
- source artifacts and ingestion records are immutable by trigger.
- file assignment has a partial uniqueness constraint for one current assignment.
- date/timestamp and availability constraints are explicit.
- financial events model payments, refunds, failures, disputes, and processor fees separately.

### Remaining integrity gaps

- most foreign keys have no explicit delete behavior; PostgreSQL defaults to restrict, which prevents orphans but there is no documented archival lifecycle.
- `updated_at` exists on entities but no general trigger ensures it changes.
- canonical mutable tables rely on importer behavior rather than database-enforced write procedures/version history.
- C3 fixture promotion uses multiple REST batches and upserts rather than one database transaction. Retry safety is designed, but consumers may observe a partially promoted run while an import is in progress unless publication is gated.
- the C3 validation command checks fixed global table counts, which will not scale once multiple fixture versions, clients, or imports coexist.
- data retention, legal hold, erasure, and archival rules are not implemented.
- C1 is fundamentally a single archive dataset without tenant ownership; it cannot be exposed to external client users as-is.

## 5. Security findings

### Access control and IDOR

Authentication works, but authorization is coarse and global. Dynamic routes find records by supplied IDs, and the database currently lets any active viewer read all viewer-safe rows. UI filtering is not a security boundary. This creates direct-object-reference exposure for future client accounts.

### Authentication hardening gaps

- no MFA enforcement or enrollment flows;
- no Enterprise SSO;
- no password recovery/account recovery workflow in the application;
- no explicit session lifetime or reauthentication policy in repository configuration;
- no application-level login throttling, CAPTCHA, suspicious-login alerting, or lockout evidence;
- no documented joiner/mover/leaver automation;
- role administration remains a service-role/manual SQL operation.

Supabase may provide platform controls, but production configuration and verification are not codified here.

### Request and browser security

- the login redirect validates leading `/` and rejects `//`, which is a useful basic open-redirect defense.
- no Content Security Policy, frame-ancestor policy, Permissions Policy, or repository-managed security header configuration exists.
- no rate limiting exists for `/api/health` or future APIs.
- no CSRF token is used. Current mutations are limited to Supabase auth actions and no business browser mutation exists, reducing current risk; future cookie-authenticated mutations will need deliberate CSRF/origin protection.
- React escaping reduces ordinary XSS risk, and no `dangerouslySetInnerHTML` use was found in the reviewed application path.
- there is no upload or export implementation yet; threat controls for those high-risk capabilities are absent rather than deficient.

### Secrets

- `.env*` is ignored; `.env.example` uses placeholders.
- service-role use is confined to importer/database test scripts.
- source workbooks are ignored.
- no tracked service key was found through targeted source inspection.
- automated secret scanning is absent from CI because CI itself is absent.

### Dependency vulnerabilities

`npm audit` reported six high-severity vulnerable package entries:

| Package | Direct? | Runtime relevance | Assessment |
|---|---:|---|---|
| `next` | Yes | Deployed framework | Blocks commercial production until upgraded and regression-tested. |
| `sharp` | Transitive/optional via Next | Runtime image processing if invoked | Potential runtime exposure; upgrade with Next. |
| `postcss` | Transitive via Next and Tailwind | Primarily build-time; some advisories require attacker-controlled CSS/source maps | Lower immediate staging reachability, but should be fixed before production. |
| `nanoid` | Transitive via PostCSS | Build dependency path | Low application reachability; fix through dependency refresh. |
| `brace-expansion` | Transitive via ESLint toolchain | Development/CI | Not deployed application code; still fix to keep CI safe. |
| `js-yaml` | Transitive via ESLint toolchain | Development/CI | Not deployed application code; avoid parsing untrusted YAML and update toolchain. |

The audit endpoint indicated fixes are available, but the recommended automatic Next fix is a semver-major upgrade. No dependency was changed during this audit.

## 6. Failure behavior

### Good behavior

- ambiguous or missing deployment/data-mode configuration fails visibly.
- live dashboard and claims failures render `LiveDataError`; they do not substitute demo data.
- missing financial values return unavailable/null with coverage rather than zero in core calculation paths.
- ingestion errors are recorded with run/step counts and sanitized errors.
- target mismatch aborts imports before writes.

### Risky or incomplete behavior

- no route-level error boundaries or loading states exist, so unexpected render/data errors fall to generic Next behavior.
- `lib/supabase/server.ts` intentionally swallows cookie writes in Server Components; this matches common SSR practice but provides no observability when middleware/session assumptions fail.
- sign-out ignores the returned error and always redirects, so a failed remote sign-out is not visible.
- health returns only coarse status and has no timeout/latency budget around its database call.
- C3 import promotion is multi-step. Failed runs retain evidence and can be retried, but there is no single publication transaction or `visible_at` gate for canonical consumers.
- several current live-mode domain pages intentionally show Demo Data. This is labeled, but a commercial deployment should not mix demo and customer workflows in the same navigation.
- empty-state coverage is uneven; some pages assume fixtures always contain at least one record, such as `operationsClients()[0]` in Client View.

## 7. Testing audit

### What exists

| Category | Current state |
|---|---|
| Unit | Good coverage of analytics formulas, missing/zero behavior, configuration, and deterministic adapters. |
| Integration | Fixture contract validation and importer planning; limited actual subsystem integration. |
| Database | Two executable local scripts, not part of default tests and not run in this audit because Docker was unavailable. |
| Authorization/RLS | Strong source-text assertions plus local database probes when run manually. No multi-tenant tests because tenancy is absent. |
| Ingestion | Good deterministic fixture, fingerprint, retry/idempotency, and migration-shape tests. |
| Regression | 67 default tests pass; many lock down important prior bugs. |
| API | Health route is source-inspected; no runtime API test suite. |
| UI/component | No component test runner. Product Vision tests inspect source/config rather than render behavior. |
| End-to-end | None. No Playwright/Cypress dependency or automated browser suite. |
| Deployment | Manual evidence/runbooks only. No automated preview acceptance. |
| Smoke | Manual/local HTTP checks in milestone evidence, not a current automated gate. |

### Important caveat

Many tests assert that SQL or TypeScript source contains a particular string or regex. These tests are valuable architectural linting but do not prove that PostgreSQL applies the migration, RLS behaves as intended, routes render, sessions persist, or browser interactions work. The default command excludes `tests/c2-database-security.mjs` and `tests/c3-database-security.mjs` because it runs only `tests/*.test.mjs`.

### High-risk untested areas

- cross-tenant access because no tenant model exists;
- direct-ID authorization for every client/file/handler route;
- authentication redirects, cookie refresh, expiration, logout, and role changes in E2E;
- migration apply/reset against clean and upgrade-path databases on every PR;
- importer interruption at every batch boundary and concurrent invocation;
- database consistency between client, branch, file, invoice, and payment ownership;
- UI loading/error/empty states;
- accessibility behavior of dialogs, focus trapping, and keyboard restoration;
- responsive browser rendering;
- production environment validation and deployment smoke tests.

### Recommended testing pyramid

1. Fast unit tests for analytics, validation, parsing, authorization predicates, and policy helpers.
2. Repository/service integration tests against a disposable Supabase database.
3. Migration and RLS tests that create multiple tenants and roles and attempt hostile cross-tenant queries/mutations.
4. Focused Playwright E2E for authentication, direct URLs, tenant isolation, administrator boundaries, critical dashboards, and logout/session persistence.
5. Post-deployment smoke tests against preview/staging using non-production synthetic tenants.

Playwright should be introduced. It should remain focused on critical journeys rather than duplicating all unit coverage.

## 8. Observability

### Present

- coarse health endpoint;
- Supabase platform health outside the repository;
- durable C1/C3 import/run/step/issue history;
- counts, retry numbers, timestamps, and sanitized import errors;
- manual staging evidence documents.

### Missing

- structured application logger and log schema;
- error aggregation;
- request/trace correlation IDs;
- frontend error monitoring;
- latency and performance telemetry;
- uptime checks and alert routing;
- integration health dashboard;
- alerting on failed/stale ingestion;
- affected-tenant/customer attribution;
- SLOs, retention, and incident severity policy;
- database query/performance monitoring configuration;
- on-call and incident runbook.

### Minimum production architecture

- structured JSON logs from server actions/routes with environment, request ID, actor ID, tenant ID, operation, result, latency, and sanitized error code;
- OpenTelemetry-compatible traces across Next.js, Supabase calls, imports, and external providers;
- centralized error aggregation for server and browser;
- metrics for request rate/error/latency, auth failures, database saturation, job lag, processed/quarantined/rejected rows, and last successful sync;
- an administrator integration-health view backed by durable job state;
- uptime monitoring for public health plus an authenticated deep health check;
- alerts with ownership, escalation, and runbook links.

Secrets, raw source payloads, claim note content, and sensitive payment identifiers must be excluded from telemetry.

## 9. Audit logging and accountability

The ingestion ledger is a good specialized audit trail for automated imports. General application auditability is not implemented.

A production audit-event architecture should use an append-only `audit_events` store containing:

- event ID and event schema version;
- occurred/recorded timestamps;
- actor type (`user`, `service`, `integration`, `system`) and actor ID;
- tenant/client ID;
- action and resource type/ID;
- previous and new values, preferably field-level and redacted by classification;
- reason/context;
- session ID, request/trace ID, and originating IP/user agent where lawful;
- source application/integration;
- result (`attempted`, `succeeded`, `denied`, `failed`);
- immutable integrity metadata and retention class.

Database triggers are appropriate for high-value canonical/permission changes, but request context should be supplied by controlled database functions so database facts and application actor context meet in one event. Audit reads must be separately authorized and exportable to secure retention/SIEM storage.

## 10. Documentation

### Strong and accurate

- source audit and field inventory;
- C1 live vertical slice;
- C2 staging security and deployment runbook;
- C3 architecture freeze and product walkthrough;
- provenance, lineage, financial availability, and source contracts;
- explicit known staging gaps.

### Inaccurate or stale

- the README opens by describing every record/result as synthetic, then later documents the live Q2 slice; this is internally contradictory.
- `app/settings/page.tsx` says authentication is visual-only even though C2 authentication is implemented in live mode.
- the architecture index calls the Phase B package documentation-only even though C1-C3 schema/runtime implementations now exist.
- deployment guidance includes both Netlify compatibility and Vercel staging without a current production platform decision record.
- new Client View and weather work is uncommitted and therefore not represented consistently in stable documentation.

### Missing

- commercial multi-tenant architecture and threat model;
- data classification, retention, backup, recovery, and deletion policy;
- production environment bootstrap and disaster-recovery runbook;
- incident response and observability runbook;
- dependency update policy and supported runtime matrix;
- API/interface contract documentation;
- architecture decision records for platform choices;
- developer workflow/branch policy/definition of done;
- production access-management procedure.

A competent engineer can clone, configure demo/staging, understand the data model, and run ordinary checks. They cannot independently create a secure production environment, validate tenancy, operate incidents, or execute disaster recovery without tribal knowledge.

## 11. Accessibility and UI engineering

### Strengths

- semantic tables and headings are common;
- focus-visible styling exists;
- disabled placeholders are generally marked disabled;
- charts have some accessible descriptions;
- responsive breakpoints exist across primary dashboards;
- dialogs use `role="dialog"` and `aria-modal` in newer work.

### Gaps

- no automated accessibility testing or browser matrix;
- centered and side dialogs do not consistently implement focus trapping, initial focus, background inertness, or focus restoration;
- several controls use symbolic text/icons without a unified icon/accessible-name abstraction;
- no standard loading/skeleton pattern;
- no application error boundary;
- global CSS has become difficult to reason about and has already experienced stylesheet regressions during prototype work;
- responsive behavior is validated manually, not automatically;
- Product Vision adds substantial client JavaScript and global presentation complexity to the authenticated shell even though it is a demo capability.

## 12. Production environment model

### Local

Explicit demo or live local mode is supported. Local Supabase reset/import runbooks exist. Docker availability remains an external prerequisite.

### Staging

The current strongest environment. It has a dedicated Supabase/Vercel model, explicit live mode, administrator-created accounts, validated migrations/imports, and manual evidence. It remains an internal staging environment, not a customer-ready tenant environment.

### Production

No production project should be created yet. Before production:

- tenant identity and memberships must exist;
- every browser-facing policy/view/function must enforce tenant scope;
- cross-client relational constraints must be added;
- live repositories must cover the commercial routes or those routes must be excluded;
- production authentication/account lifecycle must be designed;
- CI/CD, observability, audit logging, backups, DR, security headers, dependency remediation, and incident operations must be implemented and tested;
- synthetic data must be impossible to surface inside customer routes unless explicitly entering a separately authorized demo product.

## 13. Proposed production merge gate

Every pull request should require:

1. clean dependency install using the lockfile;
2. formatting/whitespace validation;
3. ESLint;
4. TypeScript with no emit;
5. unit and integration tests with coverage thresholds focused on domain services;
6. clean Supabase migration reset against a disposable database;
7. upgrade-path migration test from the last released schema;
8. database invariants and multi-tenant RLS/security probes;
9. importer validation and interruption/idempotency tests;
10. Next.js production build in explicit staging-like configuration;
11. Playwright critical-path tests;
12. dependency audit with an approved risk policy;
13. secret scanning (for example Gitleaks) across the full diff/history policy;
14. static analysis (CodeQL or equivalent);
15. migration lint for destructive statements and duplicate versions;
16. generated SBOM and retained build provenance;
17. preview deployment smoke test for eligible branches.

Recommended branch protections:

- protect `main` from direct pushes and force pushes;
- require pull requests and at least one independent professional review;
- require CODEOWNERS review for migrations, auth/RLS, analytics, importer, and deployment files;
- require all checks and conversation resolution;
- require branches to be current before merge;
- require signed commits or verified identities where practical;
- restrict environment deployments with separate approval and protected secrets;
- prohibit production deployment from arbitrary branches;
- retain immutable deployment and migration records.

## 14. Codebase scorecard

| Category | Score | Explanation |
|---|---:|---|
| Architecture | 6/10 | Sound staged boundaries and additive evolution, but three data paths and demo/runtime overlap remain. |
| Maintainability | 5/10 | Small dependency set and organized folders help; giant demo component, global CSS, compressed source, and multiple truths hurt. |
| Type safety | 7/10 | Strict TypeScript and no material `any`/ignore use found; runtime Supabase REST payloads are manually typed without schema generation. |
| Database integrity | 6/10 | Strong keys, provenance, immutability, availability, and event modeling; tenant-consistency constraints and publication transactions are missing. |
| Authentication | 5/10 | Working Supabase staging authentication and sessions; production lifecycle, MFA/SSO, recovery, and policy controls are absent. |
| Authorization | 2/10 | Admin/viewer boundary exists, but no tenant membership or row isolation. Unsuitable for external clients. |
| Security | 4/10 | Good service-role and grants discipline; cross-tenant exposure, missing headers/rate controls, and vulnerable dependencies block production. |
| Testing | 5/10 | Useful 67-test regression suite and manual DB probes; too much source-regex testing, no E2E/components, DB probes outside default gate. |
| Observability | 2/10 | Import job history and coarse health only; no production logging, tracing, error aggregation, metrics, or alerts. |
| Auditability | 3/10 | Strong import lineage, little general user/admin action accountability. |
| Documentation | 7/10 | Extensive architecture/audit/runbook material; some stale contradictions and major production operating docs missing. |
| Deployment discipline | 7/10 | Excellent manual staging gates and secret boundaries; no automated CI/CD or production release pipeline. |
| Failure handling | 6/10 | Core live paths fail visibly and preserve missing data; no global boundaries, limited telemetry, partial-publication risk. |
| Scalability | 4/10 | PostgreSQL model can evolve, but global viewers, client-side REST aggregation, fixed validation counts, and fixture repositories do not scale commercially. |
| Commercial readiness | 3/10 | Strong foundation for continued engineering; not safe for external customers until tenancy and production controls are implemented. |

## 15. Prioritized remediation backlog

### P0 — critical / unacceptable production risk

#### P0-1: Implement tenant identity, membership, and tenant-scoped authorization

- **Problem:** Any active authenticated viewer can read all viewer-safe C1/C3 records.
- **Affected:** `application_profiles`, C1/C3 RLS policies, `c3_operations_files`, `c3_handler_performance_inputs`, repositories, dynamic routes.
- **Why it matters:** Direct cross-customer disclosure through Supabase, URLs, IDs, exports, or future AI interfaces.
- **Recommended solution:** Add immutable tenants/accounts, user memberships, scoped roles, a safe current-tenant function/claim, and tenant predicates on every policy/view/function. Separate internal staff privileges from client privileges.
- **Scope:** Large.
- **Dependencies:** Commercial identity model and role matrix.
- **Tests:** Multi-tenant database probes for anon, client viewer, client admin, internal operator, staging admin, service role; ID guessing and direct REST tests.

#### P0-2: Enforce client ownership consistency in database relationships

- **Problem:** Repeated `client_id` and related foreign keys can disagree.
- **Affected:** branches, operational files, invoices, payment relationships, future client-owned tables.
- **Why it matters:** A bug/import can create cross-client associations even after RLS is added.
- **Recommended solution:** Introduce tenant/client composite unique keys and composite foreign keys or eliminate redundant ownership columns where ownership is derivable; validate existing rows before constraint application.
- **Scope:** Medium/large.
- **Dependencies:** P0-1 tenant model.
- **Tests:** Negative inserts/updates for mismatched client-branch-file-invoice-payment relationships and migration tests on existing data.

### P1 — required before external customers

#### P1-1: Establish one commercial live repository path

- **Problem:** many authenticated routes always render fixture/demo repositories.
- **Affected:** `app/operations/**`, `/weather`, `/carriers`, `/contractors`, `/client-dashboard`, `lib/operations/demo-repository.ts`.
- **Why:** Commercial users need consistent authoritative sources; demo/live mixing increases confusion and maintenance cost.
- **Solution:** Define repository interfaces with explicit demo/live implementations; exclude unsupported routes from production until live implementations pass acceptance.
- **Scope:** Large. **Dependencies:** P0 tenancy, approved product scope. **Tests:** contract tests and E2E source-boundary assertions.

#### P1-2: Add automated CI and protected merge gates

- **Problem:** no repository CI exists.
- **Affected:** repository/GitHub settings.
- **Why:** Current safeguards depend on manual execution and memory.
- **Solution:** Implement the merge gate in section 13.
- **Scope:** Medium. **Dependencies:** disposable test database strategy. **Tests:** intentionally failing fixture/migration/secret PRs.

#### P1-3: Make database and RLS tests mandatory

- **Problem:** executable DB probes are excluded from `npm test`; most policy tests inspect SQL text.
- **Affected:** `package.json`, `tests/c2-database-security.mjs`, `tests/c3-database-security.mjs`, migrations.
- **Why:** Regex presence does not prove PostgreSQL behavior.
- **Solution:** Run clean reset plus DB security suites in CI; extend for tenants and upgrade migrations.
- **Scope:** Medium. **Dependencies:** P0 design, CI. **Tests:** the gate itself.

#### P1-4: Implement production authentication/account lifecycle

- **Problem:** staging email/password is not a complete commercial identity program.
- **Affected:** Auth configuration, `app/login`, profiles, admin operations, runbooks.
- **Why:** Account takeover and orphaned access are commercial risks.
- **Solution:** MFA policy, recovery, email verification, invitation, deactivation, session policy, login abuse controls, optional SSO, and audited role administration.
- **Scope:** Large. **Dependencies:** tenant membership model. **Tests:** Playwright auth lifecycle and security probes.

#### P1-5: Add production observability and incident operations

- **Problem:** no structured application telemetry or alerting.
- **Affected:** Next runtime, repositories, importers, deployment, admin health.
- **Why:** Failures and customer impact cannot be detected or diagnosed promptly.
- **Solution:** implement the minimum architecture in section 8 and incident runbooks.
- **Scope:** Large. **Dependencies:** vendor decisions and data-classification policy. **Tests:** synthetic fault injection and alert delivery.

#### P1-6: Add general audit logging

- **Problem:** user/admin/business changes are not durably attributable.
- **Affected:** future mutations, auth/roles, exports, settings, integrations, reports.
- **Why:** Accountability, support, compliance, and incident investigation require it.
- **Solution:** append-only tenant-scoped audit events with controlled mutation functions and protected retention/export.
- **Scope:** Large. **Dependencies:** tenant model and action inventory. **Tests:** actor/tenant/before-after completeness and immutability.

#### P1-7: Remediate high-severity runtime dependencies

- **Problem:** current Next dependency tree has high-severity advisories.
- **Affected:** `package.json`, lockfile, build/runtime.
- **Why:** A commercially deployed framework must be on a supported secure release.
- **Solution:** perform a separately approved Next/toolchain upgrade with compatibility, E2E, and deployment testing; do not use blind `npm audit fix`.
- **Scope:** Medium. **Dependencies:** test coverage. **Tests:** full gate plus framework security regression checks.

#### P1-8: Add security headers and request-abuse controls

- **Problem:** no CSP, frame protection, permissions policy, or rate-limit architecture is codified.
- **Affected:** Next config/middleware/deployment edge configuration and API routes.
- **Why:** Browser hardening and availability protection are baseline SaaS controls.
- **Solution:** nonce/hash-aware CSP, frame ancestors, HSTS at deployment, permissions/referrer policies, rate limits, abuse monitoring, and origin/CSRF rules for mutations.
- **Scope:** Medium. **Dependencies:** hosting decision and route inventory. **Tests:** header integration tests and abuse cases.

#### P1-9: Define backup, restore, retention, and disaster recovery

- **Problem:** no production RPO/RTO, restore drill, or retention policy.
- **Affected:** Supabase, protected source storage, audit logs, deployment runbooks.
- **Why:** Customer and financial data must be recoverable and governed.
- **Solution:** encrypted backups/PITR, restore validation, retention classes, archival/deletion, regional risk decision, and recurring drills.
- **Scope:** Large. **Dependencies:** commercial/compliance requirements. **Tests:** documented restore drills and data-deletion verification.

#### P1-10: Gate canonical publication during multi-step imports

- **Problem:** C3 promotion spans REST batches and tables without one publication boundary.
- **Affected:** `scripts/c3/ingest-fixtures.mjs`, ingestion runs, live repositories.
- **Why:** Readers may observe a partially completed canonical state after interruption.
- **Solution:** stage by run and atomically publish an accepted run, or encapsulate bounded server-side transactions/RPCs with visibility predicates.
- **Scope:** Medium/large. **Dependencies:** generalized non-fixture importer design. **Tests:** interruption at each phase, concurrent runs, retry, reader visibility.

#### P1-11: Add E2E and accessibility acceptance

- **Problem:** critical browser behavior is manually tested.
- **Affected:** login, protected routes, dashboards, dialogs, logout, responsive UI.
- **Why:** Current regressions have included broken CSS/runtime local pages; source tests cannot catch them.
- **Solution:** focused Playwright suite plus automated accessibility scans and keyboard tests.
- **Scope:** Medium. **Dependencies:** stable test identities/tenants. **Tests:** itself in CI.

### P2 — important engineering hardening

#### P2-1: Consolidate production analytics/domain contracts
- **Problem:** older calculations/types overlap C3 engine concepts.
- **Affected:** `lib/calculations.ts`, `lib/observations.ts`, `lib/analytics/*`, three type modules.
- **Why:** Divergent formulas can produce inconsistent results.
- **Solution:** designate C3 engine/KPI catalog as production authority; retain demo adapters explicitly.
- **Scope:** Medium. **Dependencies:** live repository plan. **Tests:** golden cross-adapter results.

#### P2-2: Split oversized demo/UI modules and isolate demo bundles
- **Problem:** 1,148-line Product Vision component and broad global CSS.
- **Affected:** Product Vision, global CSS, staffing/client/weather components.
- **Why:** High regression and review cost.
- **Solution:** split by bounded presentation modules and load demo code only on demo route/explicit launcher.
- **Scope:** Medium. **Dependencies:** none. **Tests:** component/E2E visual interaction tests.

#### P2-3: Add standard loading, error, empty, and retry states
- **Problem:** no route error/loading boundaries; uneven empty states.
- **Affected:** App Router route groups and repositories.
- **Why:** Operational failures currently degrade inconsistently.
- **Solution:** typed error taxonomy, sanitized user errors, correlation IDs, retry affordances, standard boundaries.
- **Scope:** Medium. **Dependencies:** observability. **Tests:** fault injection and UI states.

#### P2-4: Generate/validate database types
- **Problem:** REST response shapes are manually declared and cast.
- **Affected:** `lib/data/live-repository.ts`, weather repository, future live repositories.
- **Why:** Schema drift may become runtime failure.
- **Solution:** generated Supabase types plus runtime validation at external boundaries.
- **Scope:** Medium. **Dependencies:** stable schema. **Tests:** contract/schema drift checks.

#### P2-5: Add data classification and privacy engineering
- **Problem:** no implemented classification/handling matrix for PII, claim notes, financial identifiers, and weather/provider data.
- **Affected:** schema, logs, exports, storage, support tools.
- **Why:** Controls and retention cannot be correct without classification.
- **Solution:** field classification, least-privilege interfaces, redaction, support-access controls, retention/deletion workflows.
- **Scope:** Large. **Dependencies:** legal/compliance decisions. **Tests:** export/log/redaction tests.

#### P2-6: Replace fixed global validation counts with run-scoped validation
- **Problem:** C3 validator assumes one permanent fixture dataset and fixed table totals.
- **Affected:** `scripts/c3/ingest-fixtures.mjs`.
- **Why:** Later imports will make valid databases fail validation or hide per-run discrepancies.
- **Solution:** validate by ingestion run/artifact/client and explicit expected manifests.
- **Scope:** Medium. **Dependencies:** generalized importer. **Tests:** multiple sequential and concurrent datasets.

#### P2-7: Correct documentation and source encoding
- **Problem:** README/settings claims conflict with implementation; mojibake exists.
- **Affected:** README, settings copy, architecture index, several TSX files.
- **Why:** Engineers and customers can misunderstand actual security/data behavior.
- **Solution:** update verified documentation and normalize valid UTF-8 without altering semantics.
- **Scope:** Small/medium. **Dependencies:** production decisions. **Tests:** documentation link/encoding scan.

### P3 — desirable improvement

#### P3-1: Adopt architecture decision records and ownership metadata
- **Problem:** major choices are documented in long milestone plans rather than concise durable decisions.
- **Solution:** ADRs plus CODEOWNERS for security/data/deployment boundaries.
- **Scope:** Small.

#### P3-2: Establish performance budgets
- **Problem:** no bundle, server latency, or database query budgets.
- **Solution:** route budgets, Web Vitals, query plans, pagination limits, and performance regression checks.
- **Scope:** Medium.

#### P3-3: Establish visual regression testing
- **Problem:** responsive and theme regressions are found manually.
- **Solution:** a small approved screenshot matrix for critical pages and dialogs.
- **Scope:** Medium.

## 16. Recommended sequence

1. Freeze external-customer deployment and approve the tenant/identity/role threat model.
2. Implement P0 tenant membership, tenant-scoped RLS, and relational ownership constraints through additive migrations.
3. Put clean database reset, multi-tenant security probes, ordinary checks, and secret/dependency scanning into CI.
4. Establish one live repository path and exclude unfinished demo routes from customer deployments.
5. Implement production authentication lifecycle, audit logging, observability, security headers, backups, and incident operations.
6. Add Playwright critical-path coverage and production deployment gates.
7. Upgrade vulnerable dependencies under that test safety net.
8. Then perform the narrower maintainability and documentation hardening work.

## Final recommendation

**Incremental hardening is recommended. Major architectural restructuring is not.**

The ingestion, provenance, database-event modeling, staging discipline, and analytics boundaries are valuable and should remain. The most important work is to add the commercial control plane around that foundation: tenant ownership, enforceable authorization, automated proof, observability, auditability, secure identity lifecycle, and production operations.

No external customer or production environment should be authorized until both P0 items and the relevant P1 security/operational gates are complete and independently tested.
