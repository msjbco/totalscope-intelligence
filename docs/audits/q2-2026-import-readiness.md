# Q2 2026 Import Readiness

## Classification

| Field family | Classification | C1 treatment |
|---|---|---|
| Workbook/import provenance | Ready After Deterministic Transformation | Hash, filename, sheet, row, parser and mapping versions |
| Claim Item ID | Ready for Direct Import | Preserve as text; unique within source |
| Claim number | Ready for Direct Import | Preserve text; tenant/source uniqueness |
| Claim display name | Ready with Review Queue | Protect as PII; do not parse identity/address automatically |
| Contractor organization | Ready After Deterministic Transformation | Create alias candidates; organization review |
| Branch | Not Present in Source | Nullable/schema placeholder only |
| Current status | Ready After Deterministic Transformation | Map Complete/Closed; preserve raw; confirm distinction |
| Service type | Not Ready | No explicit field; CH-presence inference prohibited |
| Property type | Not Present in Source | Keep unavailable/unknown under approved policy |
| Assigned date | Ready with Review Queue | Import raw milestone; meaning needs confirmation |
| Closed date | Ready After Deterministic Transformation | Date-only completion candidate |
| Date of loss | Ready After Deterministic Transformation | Nullable date; 78.50% coverage |
| Reopen/supplement | Ready with Review Queue | Preserve raw/date; semantics unresolved |
| Status history | Schema Placeholder Only | Do not fabricate from snapshots |
| Current claim handler | Ready with Review Queue | Staff alias resolution; current evidence only |
| Admin/support | Ready with Review Queue | Business meaning and assignment type required |
| Contractor rep | Ready with Review Queue | Label/contact evidence; no account creation |
| Carrier | Ready After Deterministic Transformation | Versioned alias table |
| Adjuster name/contact | Ready with Review Queue | Carrier-scoped identity resolution |
| Property address | Ready with Review Queue | Restricted PII; structured column only 26.64% |
| Initial carrier RCV | Ready After Deterministic Transformation | Minor units; explicit availability; preserve true zero |
| Current/final RCV candidate | Ready with Review Queue | Import as source `current`; final semantics require confirmation |
| Additional RCV | Ready After Deterministic Transformation | Recalculate/version; retain observed source value |
| Requested RCV | Ready with Review Queue | Preserve as source fact pending definition |
| Client fee/rate | Ready with Review Queue | Not invoice or collected revenue |
| Percentage increase | Not Ready | Unit/outlier policy unresolved |
| Invoice/amount collected/outstanding | Not Present in Source | Await operational/accounting/Stripe facts |
| Other future financial fields | Not Present in Source | Schema placeholder only when approved |
| Claim updates and replies | Ready After Deterministic Transformation | Immutable source records, redacted diagnostics, parent links |
| Orphan updates | Ready with Review Queue | Quarantine 58 rows / 56 IDs |
| Subitem headers/details | Ready with Review Queue | Stage with row type and positional parent; defer canonical promotion |
| Free-text fact extraction | Not Ready | Future governed extraction with evidence and review |

## Recommended first C1 vertical slice

1. Register the immutable workbook and SHA-256.
2. Stage both worksheets with sheet name, physical row, raw cell values/types, and deterministic row type.
3. Promote the 214 claims using source Item ID and claim number.
4. Promote raw/normalized current status, contractor, carrier, handler/admin assignment candidates, source dates, and structured financial facts.
5. Recalculate additional RCV under a versioned rule and record the one missing-component case.
6. Promote all 5,957 updates as immutable source records; link 5,899 rows to archived claims and quarantine 58 rows.
7. Stage all 1,359 subitem details and 148 repeated header rows; defer semantic promotion until parent/order and field meanings are approved.
8. Generate data-quality and identity-resolution issues rather than guessing.

Explicitly out of scope for the first slice:

- production authentication/user creation;
- inferred service/property type;
- fabricated status history;
- invoice, revenue, or collection facts;
- free-text extraction;
- Stripe reconciliation;
- weather matching;
- permanent branch inference.

## Blocking decisions before C1

1. **Row schemas:** approve claim, repeated subitem header, and subitem-detail classifiers.
2. **Duplicate headers:** approve position-based canonical source keys for both duplicate families.
3. **Service type:** decide whether source owners can supply an explicit field; CH presence is not sufficient.
4. **Date semantics:** define `Assigned`, `Closed Date`, `Date of Status Change`, and `CH Update`.
5. **Timezone:** select a source-timezone assumption or defer UTC conversion.
6. **Subitem parentage:** accept positional parenting for staging or obtain a relational export.
7. **Financial semantics:** confirm `Current Ins. RCV`, `Requested RCV`, `Client Fee`, and percentage units.

## C1 acceptance tests

### Source integrity

- Workbook hash is exactly `8c25be883993f821e6deff6a6aa787d30ee9d794b5cf7fe73a41b58c67f06323`.
- Re-running the same import is idempotent.
- Source workbook remains outside Git and unchanged.
- Every staged record retains import job, workbook, sheet, physical row, raw value/type, parser version, and transformation version.

### Row reconciliation

- Archive physical data rows: 1,721.
- Claim rows: 214.
- Repeated subitem header rows: 148.
- Subitem detail rows: 1,359.
- Those classifications sum to 1,721.
- Updates rows: 5,957.

### Identity and references

- All 214 claim rows have unique source Item IDs and unique claim numbers.
- All 5,957 updates have unique Post IDs.
- 270 unique Item IDs are referenced by updates.
- 58 update rows with 56 unique IDs are quarantined as not present in the archive claim set.
- No claim row is silently discarded because an identity alias is unresolved.

### Null and value fidelity

- Blank financial cells remain NULL with availability status.
- Eleven true-zero Initial RCVs remain zero.
- Two true-zero Client Fees remain zero.
- Numeric-looking IDs remain strings.
- Unknown enum values are quarantined, not guessed.
- Date raw values are preserved beside parsed local values.
- No timezone-less timestamp is labeled UTC.

### Derived values

- 213 claims reproduce `Current Ins. RCV − Initial Ins. RCV = Additional Secured $` exactly.
- One claim records missing-component coverage rather than substituting zero.
- Derived values store calculation version, input lineage, validation status, and coverage.

### Updates and subitems

- Reply Parent Post IDs are retained.
- Twelve blank update bodies remain valid metadata records with quality issues.
- Duplicate text bodies do not cause Post ID deduplication.
- Subitem rows retain positional parent evidence and are not parsed under the claim header.

## Go/no-go recommendation

**Conditional go** for C1 schema and importer design after the seven blocking decisions are explicitly recorded. The source is strong enough to validate a provenance-first vertical slice, but a flat-table importer or automatic semantic enrichment would be unsafe.
