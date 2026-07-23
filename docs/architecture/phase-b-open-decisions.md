# Phase B Open Decisions

These decisions must be resolved before production schema finalization.

| ID | Decision | Options / concern | Owner |
|---|---|---|---|
| OD-01 | Tenant topology | client-per-tenant vs managed multi-organization tenant | Product + Security |
| OD-02 | Email uniqueness | global account uniqueness vs tenant-scoped identity provider | Security |
| OD-03 | Reopened completion | first completion, latest completion, or both as separate metrics | Operations |
| OD-04 | Business timezone | tenant timezone vs fixed TotalScope reporting timezone | Finance + Product |
| OD-05 | Currency | USD-only V1 and behavior for non-USD Stripe rows | Finance |
| OD-06 | Financial field availability | record-level plus field-level states and precedence | Data |
| OD-07 | Amount collected | settled allocations only vs pending inclusion | Finance |
| OD-08 | Net collections | processor fees and dispute treatment | Finance |
| OD-09 | Stripe match automation | confidence thresholds and approver requirements | Finance + Data |
| OD-10 | Archive authority | authoritative source per field and override precedence | Operations |
| OD-11 | Monday identity | stable board/item identifiers and historical board changes | Data |
| OD-12 | Homeowner reference | retention, encryption, search, and role access | Security + Legal |
| OD-13 | Adjuster identity | merge policy across carriers and email changes | Operations |
| OD-14 | Contractor ranking | transparent dimensions vs approved composite weighting | Product |
| OD-15 | KPI confidence | coverage thresholds and material-error overrides | Analytics |
| OD-16 | Support access | expiring cross-tenant grant and approval flow | Security |
| OD-17 | Content publishing | self-approval and legal/compliance review | Editorial |
| OD-18 | Retention | raw archives, Stripe artifacts, financial facts, observations | Legal + Security |
| OD-19 | Law firms | organization associations needed beyond generic type | Product |
| OD-20 | Integration mode | periodic files, APIs, or hybrid Monday/Stripe ingestion | Engineering |

## Decision record requirement

Each resolved item needs an architecture decision record containing decision, date, owners, alternatives, implications, migration impact, and review date. No default in these documents should be treated as approved where an open decision exists.
