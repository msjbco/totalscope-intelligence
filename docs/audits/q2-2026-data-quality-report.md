# Q2 2026 Data Quality Report

## Method

Scores use a 0–100 evidence-weighted assessment:

- 90–100 A: suitable for controlled import with standard validation;
- 75–89 B: usable after deterministic transformation;
- 60–74 C: usable with material coverage or semantic limitations;
- 40–59 D: review-heavy;
- below 40 Limited: not suitable for canonical promotion.

Scores combine observed coverage, key uniqueness, parsing validity, cross-field reconciliation, source semantics, and whether errors can be deterministically quarantined. They are audit judgments, not source facts.

## Scorecard

| Dimension | Score | Grade | Basis |
|---|---:|---|---|
| Completeness | 68 | C | Core claim IDs/status/handler/carrier/closed date are complete; classification, branches, invoices, and many contacts are absent |
| Uniqueness | 95 | A | 214 unique claim IDs and 5,957 unique Post IDs; physical duplicate rows are repeated nested headers |
| Validity | 82 | B | Dates and core claim financials parse cleanly; percentage units and duplicate headers need controls |
| Consistency | 76 | B | 213/213 available RCV equations match; hierarchical schemas make flat interpretation unsafe |
| Referential integrity | 90 | A | Every archived claim has updates; 58 update rows reference 56 external/nonarchive IDs and can be quarantined |
| Timeliness | 72 | C | Q2 archive includes claims assigned earlier and updates through July 15; snapshot timing needs definition |
| Financial reliability | 62 | C | Excellent arithmetic consistency but no currency, invoice, cash, or explicit availability facts |
| Identity reliability | 66 | C | Strong handler/admin coverage; partial adjuster/rep contacts and no authoritative identity master |
| Lifecycle reliability | 70 | C | Complete current status/closed dates, but no full event history or explicit service type |

Overall recommendation: **Ready for a provenance-first C1 vertical slice with deterministic parsing and review queues; not ready for direct canonical bulk load.**

## Priority issue register

| Severity | Issue | Affected rows | Business impact | Recommended treatment | Blocks C1? |
|---|---|---:|---|---|---|
| High | Primary sheet interleaves three row schemas | 1,721 | Flat ingestion corrupts claims, people, dates, and financials | Mandatory row classifier and schema-specific parser | Yes |
| High | Subitem parent relationship is positional | 1,359 detail rows | Reordering can attach work to wrong claim | Preserve physical row and preceding parent; seek better export | Yes for subitem promotion |
| High | No explicit service type | 214 claims | Cannot reliably separate estimate-only and claim-handling cohorts | Keep unavailable or review; do not infer solely from CH | Yes for service-specific metrics |
| High | Source timezone absent | 5,957 updates | UTC conversion could move activity across dates/quarters | Preserve raw/local timestamp; approve timezone before UTC | Yes for UTC promotion |
| Medium | 58 updates reference IDs outside archived claims | 58 | Referential gap if importer requires only archive claims | Import as quarantined source updates; investigate 56 IDs | No |
| Medium | Duplicate column names | 2 header families | Name-based parsers may overwrite values | Address by worksheet position and deterministic suffix | Yes |
| Medium | `Percentage Increase` has maximum 4,510 | 1+ suspected | Financial percentage KPI can be severely distorted | Confirm units and establish validation range | No if excluded |
| Medium | Initial RCV missing for one claim | 1 | Additional-RCV derivation lacks one operand | Preserve NULL/status; source additional remains evidence | No |
| Medium | Requested RCV meaning is unconfirmed | 212 | Incorrect mapping could confuse requested/final amounts | Source-owner definition; retain raw staged field | No |
| Medium | Client Fee meaning is not invoice/cash authority | 214 | Could overstate revenue | Label source fee only; wait for invoice/Stripe facts | No |
| Medium | Adjuster email coverage is 42.06% | 124 blanks | Automated identity resolution is weak | Carrier-scoped review queue; no name-only merge | No |
| Medium | Contractor-rep email coverage is 7.48% | 198 blanks | Cannot create reliable user accounts | Import assignment label only; defer account creation | No |
| Medium | Full status history absent | 214 | Stage-duration and backward-movement metrics unavailable | Preserve snapshot; do not fabricate events | No |
| Low | Duplicate update bodies | 398 surplus rows | Text analytics may double-count repeated templates | Keep unique posts; normalize body only for analysis | No |
| Low | Blank update bodies | 12 | Content analysis gap | Retain update metadata and blank-body quality issue | No |
| Low | Update rows extend to July 15 | update subset | “Q2 archive” is not a strict Q2 activity window | Use source quarter and event date separately | No |
| Informational | No formulas | all sheets | Values are static snapshots, not recalculating workbook logic | Retain raw values and validate independently | No |
| Informational | No hidden or merged cells | both sheets | Simplifies deterministic inspection | No action | No |

## Financial reliability detail

- Claim-level current RCV and additional secured coverage: 100%.
- Initial RCV coverage: 99.53%.
- RCV equation: 213 exact matches, zero tolerance-only matches, zero mismatches, one missing-component case.
- Blank values and true zero values are distinguishable.
- No negative core financial values were observed.
- No structured invoice or cash-reconciliation facts exist.
- `Client Fee` has two true zero values; they must remain zero.
- `Initial Ins. RCV` has eleven true zeros and one blank; those states must remain distinct.

Financial claims can be imported as source facts with field-level availability. Revenue and collections cannot.

## Identity reliability detail

Basic normalization detected one adjuster-email case/punctuation collision and no similar collisions in the sampled raw organization/person fields. This only measures superficial variants. It cannot identify:

- two people sharing a name;
- one person changing email;
- carrier-specific adjuster employment;
- contractor branches hidden inside contractor names;
- the same physical person using separate account emails.

Identity imports require source labels, organization context, and review states. They must not create authenticated users.

## Lifecycle reliability detail

Current claim status and closed date are complete and consistent, and no assigned date occurs after closed date. However:

- only `Complete` and `Closed` are observed;
- the distinction is undefined;
- no explicit service/property type exists;
- date columns are snapshots, not status events;
- reopen semantics are unclear;
- no transition actors or interval ends are available.

The approved status-history model remains appropriate, but this archive can populate only an imported snapshot and selected milestone evidence.
