# Archive Import and Provenance

## Import stages

1. **Receive:** hash and register immutable source artifact.
2. **Parse:** extract source rows without semantic changes.
3. **Profile:** measure completeness, uniqueness, types, and enum drift.
4. **Map:** apply versioned source-to-canonical mappings.
5. **Normalize:** standardize identifiers, dates, money, enums, and references.
6. **Validate:** enforce tenant, referential, lifecycle, and financial rules.
7. **Stage:** hold candidates and issues without mutating canonical records.
8. **Promote:** transactionally upsert approved facts with provenance.
9. **Reconcile:** link invoices, payments, organizations, people, and files.
10. **Report:** publish counts, rejects, warnings, and lineage.

The flow source is [tsi-data-flow.mmd](diagrams/tsi-data-flow.mmd).

## Immutable provenance

Every source artifact has hash, original name, source system, archive quarter, received time, covered period, parser version, and secure storage pointer. Every source row stores artifact/job linkage, locator, raw payload or protected pointer, source timestamps, and row hash.

Canonical fields imported from archives retain field-level lineage where practical. Manual corrections create audited overrides; they do not rewrite source rows.

## Quarter handling

`source_archive_quarter` is copied from archive organization or import declaration. `submission_quarter`, `completion_quarter`, `invoice_quarter`, `due_quarter`, and `collection_quarter` derive independently from their dates. Conflicts create quality issues and never silently move source records between archives.

## Monday source-to-canonical template

| Source board | Source column ID | Source label | Canonical entity.field | Transform | Required | Null/status rule | Reference resolver | Example | Owner |
|---|---|---|---|---|---:|---|---|---|---|
| `<board>` | `<column_id>` | `<label>` | `claim_file.file_number` | trim | yes | reject blank | — | `TS-1042` | Data Ops |
| `<board>` | `<column_id>` | `<label>` | `claim_file.current_status` | enum map v1 | yes | issue unknown | — | `In Progress` | Operations |
| `<board>` | `<column_id>` | `<label>` | `file_financial.final_rcv_minor` | decimal→minor units | no | set explicit availability | — | `4250000` | Finance |
| `<board>` | `<column_id>` | `<label>` | `file_assignment.assignee_user_account_id` | normalized email | no | unresolved-reference issue | user email | — | Operations |

Mappings are configuration artifacts with version, effective dates, reviewer, and tests.

## Stripe source-to-canonical template

| Stripe report | Source field | Canonical entity.field | Transform | Match use | Required | Issue on failure |
|---|---|---|---|---|---:|---|
| balance / payments | `payment_intent_id` | `payment.processor_payment_intent_id` | trim | exact identity | yes | reject row |
| payments | `metadata.internal_invoice_id` | reconciliation candidate | trim | hierarchy 1/3 | no | continue hierarchy |
| payments | `metadata.totalscope_file_id` | reconciliation candidate | trim | hierarchy 2/3 | no | continue hierarchy |
| balance | `amount` | `payment.gross_amount_minor` | currency-aware parse | amount matching | yes | invalid amount |
| balance | `available_on` | `payment.settled_at` | timezone policy | collection quarter | yes | invalid date |

## Conflict policy

Priority is not “latest wins.” Each field defines authoritative sources, effective-time semantics, and manual override policy. Conflicts create traceable issues with candidates and resolution; the losing source value remains retained.
