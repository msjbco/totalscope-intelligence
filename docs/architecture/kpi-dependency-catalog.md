# KPI Dependency Catalog

Every metric definition is versioned and returns value, numerator, denominator, exclusions, coverage, confidence, measurement status, explanation, and drill-down context.

| KPI | Source facts | Formula / cohort | Required quality |
|---|---|---|---|
| Total submitted files | file ID, submitted date | distinct files in submission cohort | unique file ID, valid date |
| Estimate-only files | service type, submitted date | submitted files where `estimate_only` | valid service type |
| Claim-handling files | service type, submitted date | submitted files where `claim_handling` | valid service type |
| Active inventory | current status | files not in completion or exception terminal | valid status projection |
| Closed files | completion status/date | qualifying completion transitions | lifecycle-valid completion |
| Additional RCV | initial and final RCV | sum `(final - initial)` for eligible files | both captured/valid, same currency |
| Average additional RCV | additional RCV | sum / eligible file count | coverage disclosed |
| Median additional RCV | additional RCV | median eligible file value | coverage disclosed |
| Average cycle time | submitted/opened and completion dates | mean elapsed calendar days | valid ordered dates |
| Median cycle time | same | median elapsed calendar days | valid ordered dates |
| File aging | opened date, terminal status, as-of date | active count by age bucket | valid opened date |
| Update frequency | update timestamps | mean interval across qualifying updates | ordered timestamps |
| Days since last update | latest update, as-of date | elapsed calendar days | at least one update |
| Carrier mix | carrier association | carrier files / selected files | resolved carrier |
| Contractor ranking | contractor, completion, financials | governed composite or displayed dimensions | no opaque composite until approved |
| Operational production | completion date, applicable charges | completed work by completion cohort | completion validity |
| Invoiced revenue | invoices and charges | active invoice amount by invoice date | balanced invoice |
| Cash received | settled payment allocations | settled allocations by payment date | reconciled payment |
| Net collections | payments, refunds, disputes, fees | definition-versioned net by payment date | processor completeness |
| Fee revenue | TotalScope charge lines | eligible charges by selected revenue lens | charge typing and date |
| Financial coverage | financial availability | usable files / applicable files | explicit statuses |
| Completion-to-cash | completion, invoice, allocation | collection by completion cohort and collection period | cross-entity reconciliation |

## Dependency layers

1. Immutable source facts.
2. Canonical normalized entities.
3. Quality eligibility and explicit exclusions.
4. Date/cohort projection.
5. Metric calculation.
6. Metadata and confidence.
7. Presentation.

## Confidence baseline

- A: at least 95% eligible coverage with no material errors.
- B: 80–94.99% coverage or only nonmaterial warnings.
- C: 50–79.99% coverage; directional only.
- D: below 50% or material quality concerns.
- Unavailable: required inputs absent or invalid.

Thresholds are proposed and must be approved before production.

## Completion and collection example

A March 20 completion is counted in Q1 operational production. Its April invoice is Q2 invoiced revenue. A June allocation is Q2 cash. A July allocation is Q3 cash. Completion-to-cash shows both cash events under the Q1 completion cohort without rewriting their collection quarters.
