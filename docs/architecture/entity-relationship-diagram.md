# Entity Relationship Diagram

The canonical Mermaid source is [tsi-canonical-er.mmd](diagrams/tsi-canonical-er.mmd). It emphasizes ownership and reconciliation relationships rather than every attribute.

## Relationship rules

- A tenant has many organizations, users, files, imports, invoices, and payments.
- An organization may have one parent and many branches.
- A user belongs to one tenant and, for client accounts, one branch.
- Platform roles and business functions are independent many-to-one grants.
- A file has append-only statuses and time-bounded assignments.
- Only one assignment of a given type is current per file.
- A file may have multiple invoices; an invoice has multiple charge lines.
- Payments and invoices are many-to-many through allocations.
- Every imported canonical mutation traces to an import job and source record.
- Weather matching is versioned and does not imply causation.

## Tenant boundary

All edges between tenant-scoped entities must share `tenant_id`. Foreign-key validity alone is insufficient: database constraints, access policies, and service-layer checks must prevent cross-tenant references. Platform-owned reference entities may be linked only through approved reference foreign keys.
