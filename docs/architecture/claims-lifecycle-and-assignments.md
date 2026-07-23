# Claims Lifecycle and Assignments

## Canonical lifecycle

Estimate-only:

`New → In Queue → In Progress → Completed`

Claim handling:

`New → In Queue → In Progress → Claim Handling → Completed Claim Handling`

Exception terminals available from nonterminal states:

`Rejected`, `Withdrawn`

Reopening is modeled as an explicit transition into `In Queue` with a new status-history row, reason, actor, and timestamp. Historical completion remains intact.

## Status history

`file_status_history` is append-only:

- `status_history_id`, `tenant_id`, `file_id`
- `from_status`, `to_status`
- `effective_at`, optional `ended_at`
- `changed_by_user_account_id`
- `reason_code`, `comment`
- provenance for imported transitions

`claim_file.current_status` is a rebuildable projection. A partial unique index ensures one history row per file has `ended_at is null`.

## Transition constraints

- Service type determines the allowed path.
- Completion requires a qualifying completion timestamp.
- `Completed` is valid only for `estimate_only`.
- `Completed Claim Handling` is valid only for `claim_handling`.
- Rejected and withdrawn files do not contribute to completed-production KPIs unless a metric explicitly includes them.
- Imported status gaps are preserved and flagged; the importer must not invent intermediate timestamps.

## Assignment types

- `client_sales_rep`
- `client_sales_manager`
- `totalscope_estimator`
- `totalscope_claim_handler`

Carrier-adjuster association uses dedicated adjuster history because adjusters may not be application users.

Assignments have `started_at`, `ended_at`, source, assigner, and reason. A partial unique constraint permits only one current assignee for `(file_id, assignment_type)`. Reassignment closes the existing row and inserts a new row transactionally.

## Standard associations

Every file references client organization and branch. Sales rep, sales manager, TotalScope estimator, TotalScope claim handler, carrier, and adjuster are nullable when unknown. Homeowner name is reference-only, is not a user identity, and should be access-restricted.

## Quarter derivation

- `submission_quarter` derives from `submitted_at`.
- `completion_quarter` derives from the first qualifying terminal completion transition, unless an approved reopened-file policy supersedes it.
- `source_archive_quarter` is imported provenance and never recalculated.
