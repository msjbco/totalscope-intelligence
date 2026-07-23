# TotalScope Intelligence Phase B Architecture

Status: architecture blueprint; no production schema or runtime implementation.

This package defines the canonical information model for restoration estimating, claim handling, financial reconciliation, archival provenance, and future knowledge intelligence.

## Document map

- [Canonical data model](canonical-data-model.md)
- [Entity relationship diagram](entity-relationship-diagram.md)
- [Roles and permissions](roles-and-permissions-model.md)
- [Claims lifecycle and assignments](claims-lifecycle-and-assignments.md)
- [Financial and revenue model](financial-and-revenue-model.md)
- [Stripe reconciliation architecture](stripe-reconciliation-architecture.md)
- [Archive import and provenance](archive-import-and-provenance.md)
- [KPI dependency catalog](kpi-dependency-catalog.md)
- [Data quality framework](data-quality-framework.md)
- [Knowledge and staff intelligence](knowledge-and-staff-intelligence-model.md)
- [Open decisions](phase-b-open-decisions.md)
- [Implementation plan](phase-b-implementation-plan.md)
- [Canonical ER source](diagrams/tsi-canonical-er.mmd)
- [Data-flow source](diagrams/tsi-data-flow.mmd)

## Architectural principles

1. Tenant-owned records carry an immutable `tenant_id`; access is tenant-scoped before business-role checks.
2. Source facts, derived metrics, and human observations remain distinct.
3. Imported values retain immutable source references and raw representations.
4. Histories are append-only; current values are projections, not replacements for history.
5. Missing financial data is a status, never a numeric zero.
6. Completion, invoice, due, and collection quarters answer different questions and remain separate.
7. Payments and invoices reconcile through allocations; no one-to-one assumption is permitted.
8. Person identity is not inferred across different user-account emails.

## Naming and key conventions

- Primary keys: UUID/ULID-compatible `*_id`.
- Tenant keys: required `tenant_id` on tenant-scoped entities.
- Timestamps: UTC `timestamptz`; business dates are separate `date` columns.
- Money: integer minor units plus ISO currency code.
- Soft deletion: `archived_at`; financial and provenance records are never hard-deleted.
- Provenance: `source_system`, `source_record_id`, `import_job_id`, `source_payload_hash`, and source timestamps where available.
