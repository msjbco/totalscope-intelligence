# Phase B Implementation Plan

This plan is sequencing guidance only. It creates no migrations or production connections.

## Stage 0 — Decisions and governance

- Resolve tenant topology, timezones, financial definitions, and source authority.
- Approve data classification, retention, access, and audit policies.
- Convert accepted decisions into ADRs and acceptance tests.

Exit: blocking open decisions have owners and approved outcomes.

## Stage 1 — Schema specification

- Translate canonical entities into reviewed logical schema.
- Define database constraints, row-level access tests, indexes, enums, and audit model.
- Produce migration plan in a future implementation milestone.

Exit: schema contract approved; still no production data.

## Stage 2 — Import laboratory

- Build isolated, nonproduction staging for representative Monday archives.
- Implement artifact hashing, parser versioning, mapping registry, profiling, and quality reports.
- Validate idempotency and immutable provenance with synthetic fixtures.

Exit: repeatable import results and reconciled record counts.

## Stage 3 — Canonical promotion

- Implement transactional promotion from staging.
- Add entity resolution queues and manual conflict handling.
- Verify tenant-boundary and lifecycle constraints.

Exit: approved synthetic/historical samples reproduce canonical outcomes.

## Stage 4 — Financial and Stripe reconciliation

- Import Stripe report fixtures.
- Implement payment, allocation, refund, dispute, fee, and issue models.
- Add deterministic matching hierarchy and manual review controls.
- Validate completion-to-cash cohorts.

Exit: reconciled samples balance to processor reports and invoices.

## Stage 5 — KPI service

- Implement versioned calculations from canonical facts.
- Attach quality coverage, confidence, exclusions, and drill-down lineage.
- Create contract tests for quarter separation and missing data.

Exit: approved metric fixtures reproduce expected results.

## Stage 6 — Application integration

- Replace synthetic source behind existing UI through stable query contracts.
- Implement production authentication and permission enforcement as a separate approved milestone.
- Add monitored import and reconciliation operations.

Exit: application consumes canonical services without embedding calculations.

## Stage 7 — Knowledge intelligence

- Implement governed authoring, evidence, review, publication, and scoping.
- Add client snapshots and quarterly briefing composition only after permissions are proven.

Exit: audited editorial workflow and tenant isolation pass.

## Cross-stage validation

Every stage requires threat modeling, tenant-isolation tests, idempotency tests, audit review, rollback design, data-quality reporting, and documented operational ownership.
