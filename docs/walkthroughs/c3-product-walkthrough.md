# C3 Product Walkthrough — Executive Operations MVP

Status: local review candidate  
Dataset: **Demo Data** — deterministic synthetic fixture `c3-deterministic-v1`  
Evaluation timestamp: June 30, 2026, 11:59:59 p.m. America/New_York

TotalScope Intelligence reduces cognitive effort by deriving operational conclusions through its centralized Analytics Engine while preserving the facts and lineage behind every material result.

## Access and data boundaries

- `/operations` and its operational drill-downs require an authenticated active application user in live mode.
- `/operations/data-health` additionally requires `staging_admin`.
- Viewers receive approved operational facts, aggregate financial results, file settlement gain, approved charges, net client gain, ROI, and KPI coverage.
- Viewers cannot read raw payment identifiers, raw import artifacts, reconciliation actions, or administrator exceptions.
- The local walkthrough uses synthetic fixtures. It does not claim current TotalScope or Stripe results.

## Page guide

### `/operations` — Executive Operations

- **Intended user:** Taylor, Breson, and operational leadership.
- **Question answered:** What requires attention, what value has been created, and how trustworthy are the results?
- **Sections:** executive summary, operational fires, service/client activity, financial results, handler production, Data Health.
- **Interactions:** drill into clients, files, handlers, or Data Health through contextual links and the section navigation.
- **Analytics:** `new_files`, `active_files`, `completed_files`, `settlement_gain`, `approved_charges`, `client_net_gain`, `roi`, service mix, collections, refunds, and processor fees from `c3-kpi-v1`.
- **Limitations:** the six-file fixture is intentionally small; handler rankings are withheld.

### `/operations/clients` — Client Operations

- **Intended user:** executives and operating leaders.
- **Question answered:** Which clients create volume and measurable financial outcomes?
- **Content:** branches, file volume, active/completed counts, settlement gain, approved charges, net gain, and ROI.
- **Navigation:** client name opens the client review; operations tabs return to summary or other dimensions.
- **Analytics:** client grouping is performed in the operations repository over canonical Analytics Engine inputs.
- **Limitations:** trend comparisons require a larger time series than this deterministic fixture.

### `/operations/clients/[clientId]` — Client Operational Review

- **Intended user:** client leadership and internal operations.
- **Question answered:** What work and value support this client’s executive result?
- **Content:** branch footprint, operating counts, financial outcomes, interpretation guidance, and supporting file links.
- **Data:** canonical clients, branches, files, captured financial facts, and approved charge facts.
- **Limitations:** carrier mix excludes unavailable carriers; missing dates remain outside cycle-time denominators.

### `/operations/files` — Operational Files

- **Intended user:** managers and analysts.
- **Question answered:** Which canonical records support dashboard results?
- **Content:** client/branch, service, status, assignment, carrier, submission date, settlement gain, and financial availability.
- **Navigation:** file identity opens traceable detail.
- **Data:** viewer-safe `c3_operations_files` fields mirrored by deterministic fixtures locally.
- **Limitations:** search and server pagination are deferred until real-volume acceptance.

### `/operations/files/[fileId]` — Canonical File Detail

- **Intended user:** managers, analysts, and administrators.
- **Question answered:** Which facts, dates, history, and sources support this file result?
- **Content:** operational identity, assignments, dates, financial facts, lifecycle, note/document metadata, and field lineage.
- **Traceability:** material facts identify their canonical source family and confidence/availability.
- **Role behavior:** viewer-safe data excludes raw payment identifiers and private note/document content.
- **Limitations:** direct source URLs are unavailable in the fixture contract and are therefore not fabricated.

### `/operations/handlers` — Claim-Handler Performance

- **Intended user:** operational management.
- **Question answered:** What has each handler completed, without overstating small samples?
- **Content:** assigned/active/completed files, cycle time, settlement gain, and eligibility.
- **Guardrail:** comparative rankings require `minimumComparativeCohortSize`, centrally configured to `10` by default.
- **Limitations:** fixture cohorts are below the threshold; counts display but rankings do not.

### `/operations/handlers/[handlerId]` — Claim-Handler Review

- **Intended user:** operational management.
- **Question answered:** What workload and outcomes support this handler’s metrics?
- **Content:** explicit cohort warning, workload, cycle and settlement measures, and supporting files.
- **Navigation:** file links provide evidence-level drill-down.
- **Limitations:** average settlement gain is unavailable when no paired initial/final RCV exists.

### `/operations/data-health` — Data Health

- **Intended user:** staging administrators.
- **Question answered:** Are source imports, mappings, coverage, and KPI inputs trustworthy?
- **Content:** source freshness, import reconciliation, missing dates/financial facts, unmatched records, ambiguous/low-confidence mappings, duplicate conflicts, KPI availability, and deterministic fingerprint.
- **Role behavior:** direct route protection plus underlying administrator-only RLS.
- **Limitations:** fixture imports contain no deliberately quarantined row; failure/recovery is proven through acceptance procedures.

## User journeys

1. **Taylor identifies operational fires.** Open `/operations`, review Attention Required, select stalled or aging files, then open a file to inspect its lifecycle and last authoritative activity.
2. **Breson reviews financial performance.** Review settlement gain, approved charges, client net gain, ROI, collections, refunds, and processor fees; open Clients to compare supported outcomes without exposing processor identifiers.
3. **A leader investigates a client or branch.** Open Clients, select Summit or Harbor, review its branch footprint and limitations, then follow a supporting file.
4. **A manager evaluates handlers responsibly.** Open Handlers, inspect counts, observe the `n<10` guardrail, and open a handler to review files without receiving a misleading rank.
5. **An administrator investigates Data Health.** Open Data Health, review both source runs, coverage, missing inputs, and the deterministic fixture fingerprint.
6. **A user traces a KPI.** Start from settlement gain, open a client, open a file, compare initial and final RCV, then inspect the lineage declarations.

## Visual evidence status

The local application passed compilation, route rendering, and HTTP acceptance. Automated in-app capture could not reach the Windows localhost listener from its isolated browser network. No hosted deployment was used to bypass this boundary. Required screenshots remain pending at:

- `docs/evidence/screenshots/c3/operations.png`
- `docs/evidence/screenshots/c3/clients.png`
- `docs/evidence/screenshots/c3/client-detail.png`
- `docs/evidence/screenshots/c3/files.png`
- `docs/evidence/screenshots/c3/file-detail.png`
- `docs/evidence/screenshots/c3/handlers.png`
- `docs/evidence/screenshots/c3/handler-detail.png`
- `docs/evidence/screenshots/c3/data-health.png`

## Deferred functionality

- Real TotalScope/Stripe source imports beyond the approved deterministic fixture
- Real-volume search, sorting, and pagination for C3 operational tables
- Source deep links until an authoritative source URL contract exists
- Observations, recommendations, executive PDF reports, and conversational Ask TSI
- Client portal functionality and predicted client-facing charges
