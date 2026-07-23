# Data Quality Framework

## Dimensions

- **Completeness:** required values and explicit availability states.
- **Validity:** types, dates, money, enums, and lifecycle transitions.
- **Uniqueness:** files, invoices, accounts, processor transactions, artifacts.
- **Consistency:** quarter/date relationships, totals, currency, tenant ownership.
- **Referential integrity:** organizations, branches, assignees, carriers, invoices.
- **Timeliness:** source delay, stale active files, reconciliation aging.
- **Provenance:** traceable artifact, row, mapping, parser, and override.

## Rule result

Each evaluation emits rule ID/version, entity/field, severity, observed value fingerprint, message, import job, first/last seen, state, owner, and resolution. States: `open`, `accepted_exception`, `corrected_source`, `corrected_canonical`, `superseded`.

Severity:

- `critical`: tenant leak, duplicate processor payment, financial imbalance.
- `error`: cannot promote record or calculate required result.
- `warning`: promotable with reduced confidence or incomplete coverage.
- `info`: anomaly for review.

## Core rules

- Email is normalized and globally unique per account.
- Branch belongs to the same tenant and organization as its file.
- Only one current assignment per file and assignment type.
- Status transitions are valid for service type.
- Completion status has a qualifying completion date.
- Financial nulls have explicit availability status.
- Invoice total equals active charge-line total.
- Allocations do not exceed settled payment availability.
- Archive hashes and processor IDs are unique within scope.
- Derived quarters agree with source dates; archive quarter remains independent.

## Quality and KPIs

Every KPI publishes denominator, eligible numerator, excluded counts by reason, coverage, freshness, and confidence. Low coverage changes confidence or produces `unavailable`; it never substitutes zero.

## Monitoring

Import reports summarize staged, promoted, rejected, and warned records. Operational dashboards should track open issues by severity, source, tenant, owner, and age. Production thresholds and escalation owners remain open decisions.
