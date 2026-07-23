# Stripe Reconciliation Architecture

## Purpose

Periodic Stripe reports are imported as immutable processor facts, normalized, then matched to canonical invoices. Payment, allocation, refund, dispute, fee, and net-collection concepts remain separate.

## Entities

### `stripe_import_job`

Fields include job ID, tenant, report type, source artifact hash, covered period, Stripe account, imported-by account, started/completed timestamps, row counts, status, and parser version. Unique `(tenant_id, stripe_account_id, source_artifact_hash)`.

### `payment`

Canonical processor transaction with Stripe payment/charge/payment-intent IDs, customer ID, gross amount, currency, processor timestamps, settlement status, metadata snapshot, and provenance.

### `payment_allocation`

Many-to-many bridge between payment and invoice. Stores allocated minor units, allocation method, confidence, reconciled-by, and timestamps. Sum of active allocations may not exceed settled payment amount net of explicitly allocated refunds.

### Related entities

`refund`, `dispute`, and `processor_fee` retain Stripe IDs and link to payments. `reconciliation_issue` stores issue type, severity, state, candidates, resolution, and audit fields.

## Matching hierarchy

1. Exact internal invoice ID.
2. Exact TotalScope file ID.
3. Stripe metadata fields.
4. Customer + amount + configurable date window.
5. Organization + amount + configurable date window.
6. Manual review.

Automatic allocation requires a unique candidate and policy-defined confidence. Heuristic candidates do not mutate invoices until accepted.

Suggested future Stripe metadata:

- `totalscope_file_id`
- `internal_invoice_id`
- `client_organization_id`
- `branch_id`

## Reconciliation states

| State | Example |
|---|---|
| `unmatched` | No plausible invoice |
| `candidate_found` | One heuristic match awaiting policy or review |
| `ambiguous` | Multiple invoices share customer, amount, and window |
| `partially_allocated` | Payment covers part of an invoice or has residual cash |
| `fully_allocated` | Settled amount is completely allocated |
| `overallocated_blocked` | Proposed allocations exceed available payment |
| `refunded` | Allocated payment later refunded |
| `disputed` | Payment has an open or lost dispute |
| `resolved_manual` | Reviewer completed a reason-coded resolution |

Example: a $1,000 payment allocates $600 to invoice A and $400 to invoice B. Invoice A later receives a $100 refund. Gross cash remains $1,000; refunds are $100; net collections under the settlement view are $900; allocations retain their original and adjusted audit history.

## Idempotency and audit

- Processor IDs and artifact hashes prevent duplicate import.
- Imports append processor facts and never overwrite raw rows.
- Re-running a parser creates a versioned normalization attempt.
- Manual allocations and reversals require actor, reason, timestamp, and prior-state reference.
- Reconciliation rules carry a version so historical decisions can be reproduced.

## Security

Stripe tokens are not part of import files or canonical records. Financial imports are tenant-scoped and restricted to approved billing or TotalScope finance roles. Raw artifacts require encrypted storage, retention rules, and audited access.
