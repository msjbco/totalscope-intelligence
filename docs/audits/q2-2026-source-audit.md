# Q2 2026 Monday Archive Source Audit

Audit version: `c0-q2-2026-v1`

Source: `Archive_Q2_2026_1784837413 (1).xlsx`

SHA-256: `8c25be883993f821e6deff6a6aa787d30ee9d794b5cf7fe73a41b58c67f06323`

The OS-renamed `(1)` filename is the only workbook matching the requested source stem. It opened successfully and was not modified. `data/source/` is ignored by Git.

## Executive summary

The workbook contains two visible worksheets:

| Worksheet | Physical rows | Header row | Data rows | Columns | Purpose |
|---|---:|---:|---:|---:|---|
| `archive q2 2026` | 1,726 | 5 | 1,721 | 61 | Hierarchical export of 214 closed claim items and their nested subitems |
| `updates` | 5,959 | 2 | 5,957 | 11 | Updates and replies keyed to Monday item IDs |

Neither sheet contains formulas, hidden rows/columns, or merged cells. Both sheets have duplicate header names: `CH Update` appears twice in the archive and `Content Type` appears twice in updates.

The archive sheet is not a flat table. Its 1,721 data rows reconcile exactly to:

- 214 claim rows with `Item ID (auto generated)`;
- 148 repeated `Subitems` header rows;
- 1,359 subitem detail rows with a different positional schema.

This is the most important importer constraint. Applying the claim header to every physical row produces false statuses, dates, people, and enormous false financial values because subitem IDs occupy positions used for claim financial fields.

Overall usability is good for a controlled C1 vertical slice if the importer uses explicit row-type parsing, immutable provenance, alias review queues, and field-level financial validation. It is not safe for direct flat-table ingestion.

## Workbook structure

### `archive q2 2026`

- Title rows: 1–4.
- Canonical export header: row 5.
- Claim primary-key candidate: column 61, `Item ID (auto generated)`.
- All 214 claim rows have a nonblank, unique candidate key.
- Claim rows are interleaved with repeated subitem schemas.
- Exact duplicate physical rows: 147, explained by repeated subitem header rows; exact duplicate claim rows: 0.
- No blank physical data rows within the used range.
- Relationships: claim rows are parents; subsequent `Subitems` header/detail blocks describe nested work. The workbook does not expose a parent ID on each subitem row, so parentage must be inferred from row order unless a better source export is obtained.

### `updates`

- Title row: 1; header: row 2.
- Update primary-key candidate: `Post ID`.
- 5,957 of 5,957 rows have Post IDs; all are unique.
- `Item ID` is the relationship to an archive/Monday item.
- 270 unique item IDs are referenced.
- 214 archive claim IDs all have at least one update.
- 58 update rows reference 56 unique item IDs absent from the archive claim rows.
- `Parent Post ID` is populated on 1,629 rows and supports reply threading.

## Claims and lifecycle findings

Claim count: **214**.

| Observed current status | Count |
|---|---:|
| Complete | 177 |
| Closed | 37 |

All claim rows have:

- unique source Item ID;
- unique claim number;
- nonblank name, contractor, claim handler, admin, carrier, assigned date, closed date, current RCV, additional secured, client fee, and current status.

No explicit service-type field exists. All 214 claims have a nonblank `CH` value, but treating that as authoritative `claim_handling` would be an inference. No claim can safely be labeled `estimate_only` from this workbook alone.

No explicit property-type field exists.

Lifecycle dates are snapshot columns, not complete status history. The workbook has `Assigned`, `Est. Sent`, `CH Update`, `Admin Update`, `Subitems Date Completed`, `Date of Status Change`, `Closed Date`, `Reopen - Supplement`, `LAST UPDATE`, and `Next Step Date`, but does not provide a canonical event log. The audit found:

- Assigned: 214/214, from 2025-04-08 through 2026-06-15.
- Closed Date: 214/214, from 2026-04-01 through 2026-06-30.
- Assigned-after-closed sequences: 0.
- Date of Loss: 168/214 (78.50%), from 2021-08-19 through 2026-05-18.
- Est. Sent: 183/214 (85.51%).
- Reopen/Supplement: 10/214 populated (4.67%); semantics require owner confirmation.

Backward lifecycle movement cannot be proven or disproven because complete status events are absent. Updates may contain status evidence, but free text must not be promoted during C0/C1 without a governed extractor and review process.

## Updates audit

| Measure | Result |
|---|---:|
| Total rows | 5,957 |
| Unique referenced Item IDs | 270 |
| Orphan rows vs archived claim IDs | 58 |
| Unique orphan Item IDs | 56 |
| Archive claims with no updates | 0 |
| Duplicate Post IDs | 0 |
| Blank update bodies | 12 |
| Duplicate-body surplus rows | 398 |
| Distinct authors, including blank/system | 20 |
| Estimated system-generated or unattributed rows | 381 |
| Earliest update | 2025-04-08 20:16:10 |
| Latest update | 2026-07-15 15:30:18 |

`Created At` is a text timestamp in day/month-name/year, 12-hour format. All 5,957 values parse deterministically, but none contains timezone information.

Free-text keyword opportunities:

| Pattern family | Rows mentioning pattern |
|---|---:|
| Status | 1,577 |
| Carrier/insurance | 1,150 |
| Adjuster | 874 |
| Invoice | 333 |
| Payment | 316 |
| Assignment | 68 |
| Settlement | 28 |

These are extraction opportunities only. Counts are simple deterministic text matches, may overlap, and do not establish canonical facts.

## Organization and identity findings

Claim-row profiling:

| Identity family | Coverage | Distinct raw | Notes |
|---|---:|---:|---|
| Contractor | 214/214 | 50 | Candidate client organizations; branch field is absent |
| Claim handler (`CH`) | 214/214 | 3 | Strong assignment candidate, but identity resolution still required |
| Admin | 214/214 | 5 | Business role meaning requires confirmation |
| Insurance carrier | 214/214 | 50 | Requires canonical alias registry |
| Adjuster name | 209/214 | 199 | High cardinality and five blanks |
| Adjuster email | 90/214 | 65 | 42.06% coverage; one punctuation/case normalization collision |
| Contractor rep | 101/214 | 38 | 47.20% coverage |
| Contractor rep email | 16/214 | 14 | 7.48% coverage |

Basic case/punctuation normalization produces few collisions, but that does not prove identity uniqueness. Names must not be merged without email, organization context, or review. Contractor values can seed organizations, but no explicit branch column exists. `Name` and address/contact fields contain PII and must remain protected and redacted in diagnostics.

Recommended normalization:

- trim and Unicode-normalize all names;
- lowercase and validate emails without exposing them in logs;
- retain raw carrier/contractor labels and map through versioned aliases;
- do not merge people by display name;
- create review issues for unresolved or shared identities;
- treat `Admin`, `CH`, and `CTR Rep` as role/assignment evidence, not user-account authority.

## Financial findings

All calculations below use only the 214 claim rows. The workbook has no currency-code field; USD is inferred from field names and business context and must be confirmed.

| Source field | Coverage | Zero | Negative | Malformed | Min | Median | Max |
|---|---:|---:|---:|---:|---:|---:|---:|
| Initial Ins. RCV | 213/214 (99.53%) | 11 | 0 | 0 | $0.00 | $18,179.95 | $127,587.49 |
| Requested RCV | 212/214 (99.07%) | 0 | 0 | 0 | $8,387.51 | $26,454.64 | $344,892.41 |
| Current Ins. RCV | 214/214 (100%) | 0 | 0 | 0 | $3,027.84 | $22,601.44 | $149,865.91 |
| Additional Secured $ | 214/214 (100%) | 0 | 0 | 0 | $9.75 | $3,533.35 | $67,258.58 |
| Client Fee | 214/214 (100%) | 2 | 0 | 0 | $0.00 | $282.97 | $6,725.86 |
| Client % Fee | 212/214 (99.07%) | 0 | 0 | 0 | 2.5 | 10.0 | 10.0 |
| Percentage Increase | 214/214 (100%) | 13 | 0 | 0 | 0 | 17 | 4,510 |
| Outstanding | 0/214 | — | — | 0 | — | — | — |
| Updated RCV | 0/214 | — | — | 0 | — | — | — |

No cells in these columns are formulas; values are static. Blanks are distinguishable from numeric zero. `Percentage Increase` is stored as an unformatted number and includes an extreme 4,510 value, requiring unit/range review before import.

Arithmetic test, `Additional Secured $ = Current Ins. RCV − Initial Ins. RCV`:

- exact matches: 213;
- tolerance matches within $1: 0;
- mismatches: 0;
- missing component: 1.

This is strong evidence that `Current Ins. RCV` maps to final RCV and `Additional Secured $` is a derived/check value. It does not establish what `Requested RCV` means relative to final settlement.

No explicit invoice amount, amount collected, EagleView charge, Walls charge, ACV, deductible, depreciation, prior payment, contract amount, or settlement amount is reliably present as a structured claim field. `Invoicing Notes` is free text, not an invoice fact.

## Date and timezone findings

- Claim date fields are primarily Excel date cells or date-only values with no timezone.
- Update timestamps are strings with time-of-day but no timezone.
- The update date range extends beyond Q2 through July 15, 2026.
- `Days Opened` is a numeric duration despite its date-like name and must not be parsed as an Excel serial date.
- The workbook does not make a business timezone unambiguous.

C1 should retain:

1. raw source value and cell type;
2. parsed local date or local timestamp;
3. source timezone assumption, initially unresolved;
4. UTC timestamp only when an approved timezone exists;
5. reporting-local date derived under a versioned policy.

## Normalization requirements

| Rule | Classification | Evidence |
|---|---|---|
| Parse row type before columns | Required for C1 | Claim and subitem schemas share positions |
| Trim strings; whitespace-only→NULL | Required for C1 | General source hygiene |
| Preserve true numeric zero | Required for C1 | Financial zero values exist |
| Never convert blank financials to zero | Required for C1 | Initial RCV has one blank and true zeros |
| Store money as minor units with raw value | Required for C1 | Static numeric values; no currency code |
| Parse Excel dates and update text timestamps separately | Required for C1 | Two source representations |
| Preserve Item/Post IDs as text | Required for C1 | Large numeric-looking identifiers |
| Deterministically rename duplicate headers | Required for C1 | CH Update and Content Type duplicates |
| Normalize status values with quarantine | Required for C1 | Two observed claim statuses |
| Normalize emails privately | Required for C1 | Partial contact coverage |
| Carrier/contractor alias review | Required for C1 | 50 values in each family |
| Deduplicate repeated subitem headers | Required for C1 | 148 repeated rows |
| Preserve update line breaks; normalize CRLF for comparison | Recommended | Rich email/update bodies |
| ZIP/state/address parsing from `Name` | Unsafe Without Review | PII combined in display name |
| Service type from CH presence | Unsafe Without Review | No explicit source field |
| Property type inference | Unsafe Without Review | No explicit source field |
| Free-text fact extraction | Future | High-value but ambiguous updates |

## Architecture impact

| Recommendation | Classification |
|---|---|
| Add explicit staged row types for claim, repeated subitem header, and subitem detail | Blocking Before C1 |
| Preserve workbook sheet and physical row number on every staged record | Blocking Before C1 |
| Model subitems or retain them as typed source records before canonical interpretation | Blocking Before C1 |
| Keep service/property type nullable or availability-qualified until authoritative | Blocking Before C1 |
| Add field-level financial availability and validation outcomes | Important but Nonblocking |
| Treat updates as first-class immutable source records with reply threading | No Change Required |
| Keep status-history architecture; do not fabricate events from snapshot dates | No Change Required |
| Preserve assignment history model; import current evidence with review | No Change Required |
| Add source timezone assumption to provenance | Important but Nonblocking |
| Reserve free-text extraction lineage and human review | Future Enhancement |

No approved architecture document was changed by this audit.

## Proposed C1 deterministic acceptance counts

- workbook SHA-256 equals `8c25be883993f821e6deff6a6aa787d30ee9d794b5cf7fe73a41b58c67f06323`;
- 2 worksheets;
- 1,721 archive physical data rows = 214 claims + 148 repeated subitem headers + 1,359 subitem details;
- 5,957 update rows;
- 214 nonblank and unique archive claim Item IDs;
- 5,957 nonblank and unique Post IDs;
- 270 unique update Item IDs;
- 58 update rows / 56 unique IDs quarantined as not present in archived claims;
- 0 archived claims without updates;
- 177 `Complete` and 37 `Closed` claim statuses;
- 213 exact additional-RCV arithmetic matches and 1 missing-component case;
- blank financial values remain NULL and 13/other true zero values remain zero according to field;
- every promoted record retains workbook hash/name, sheet, physical row, source ID, import job, parser version, and transformation version.
