# Q2 2026 Canonical Mapping Review

This review compares observed columns with the approved [Canonical Source Mapping Matrix](../architecture/canonical-source-mapping-matrix.md) and [Enterprise Source Field Dictionary](../architecture/source-field-dictionary.md). It recommends changes; it does not modify architecture.

Confidence: High means source semantics are supported by values and relationships; Medium requires owner confirmation; Low is ambiguous or free text.

## Primary worksheet mappings

| Pos. | Source Field | Canonical Entity.Field | Status | Transformation | Authority | Confidence | Open question |
|---:|---|---|---|---|---|---|---|
| 1 | Name | claim_file homeowner/address references | Partial Match | Protect raw; do not parse automatically | Monday display | Low | Can a better structured export replace combined PII? |
| 2 | Subtasks | source_record relationship evidence | Ambiguous | Retain raw | Monday | Low | Does display text encode counts or links? |
| 3 | TS File | claim_file external link | Match After Normalization | Validate URL; retain raw | Monday | Medium | Is link stable across environments? |
| 4 | Status | claim_file.current_status | Exact Match on claim rows | Row-type gate; enum alias | Monday pre-O | High | Are Closed and Complete semantically distinct? |
| 5 | Assigned | claim_file.submitted_at candidate | Partial Match | Excel date parse | Monday | Medium | Assignment, intake, or queue-entry date? |
| 6 | Contractor | organization.display_name | Match After Normalization | Alias and organization resolution | Monday pre-CRM | High | Does each value represent organization or branch? |
| 7 | CH | file_assignment claim_handler | Match After Normalization | Staff identity resolver | Monday | High | Is field always current assignee? |
| 8 | CH Update | source operational date | Partial Match | Deterministic duplicate-header name; date parse | Monday | Medium | What event does this date represent? |
| 9 | Initial Ins. RCV | file_financial.initial_carrier_rcv_minor | Exact Match | Decimal→minor units; status | Monday pre-O | High | Confirm USD. |
| 10 | Requested RCV | financial source fact, field pending | Ambiguous | Decimal→minor units | Monday | Medium | Requested estimate, supplement, or contractor ask? |
| 11 | Current Ins. RCV | file_financial.final_rcv_minor | Match After Normalization | Decimal→minor units | Monday pre-O | High | Is “current” always final at archive time? |
| 12 | Additional Secured $ | file_financial.additional_rcv_minor | Exact derived match | Recalculate; compare source | Canonical calculation | High | Keep source value as evidence. |
| 13 | Percentage Increase | derived financial metric | Match After Normalization | Confirm units; range validation | Canonical calculation | Low | Is 17 stored as 17% and is 4,510 valid? |
| 14 | Client % Fee | invoice charge-rate evidence | Partial Match | Confirm units and fee policy | O/accounting future | Medium | Percent or percentage points; applies to what base? |
| 15 | Client Fee | invoice_charge claim-handling fee candidate | Partial Match | Decimal→minor units | O/accounting future | Medium | Billed, expected, or calculated fee? |
| 16 | Date of Loss | claim_file.loss_date | Exact Match | Excel date parse | Monday pre-carrier | High | — |
| 17 | Est. Sent | source operational milestone | Unmapped Source Field | Date parse; retain provenance | Monday | High | Add canonical estimate-sent milestone? |
| 18 | Subitems Date Completed | source_record subitem evidence | Ambiguous | Row-type-specific parse | Monday | Low | Claim-row aggregate or text? |
| 19 | Date of Status Change | file_status_history entered candidate | Partial Match | Date parse, no event fabrication | Monday | Medium | Which status changed? |
| 20 | CRM | external link/reference | Unmapped Source Field | Retain link as source metadata | Monday | Medium | Future CRM entity/link model? |
| 21 | Company Cam link | external artifact link | Unmapped Source Field | Validate URL; retain source | Monday | High | Future evidence/document model? |
| 22 | HO Email | protected homeowner contact | Partial Match | Normalize/redact; restricted | Monday | Medium | Retention and access policy? |
| 23 | Insurance Carrier | carrier.canonical_name | Match After Normalization | Alias resolver | Canonical alias table | High | Confirm carrier vs administrator names. |
| 24 | Original Files | source artifact links | Partial Match | Retain as evidence pointers | Monday | Medium | Export representation and permanence? |
| 25 | Admin | file_assignment/admin business function | Partial Match | Staff resolver | Monday | Medium | Assignment type and currentness? |
| 26 | Admin Update | source operational date | Partial Match | Date parse | Monday | Medium | What action does it timestamp? |
| 27 | Claim Number | claim_file external carrier claim reference | Exact Match | Trim; preserve text | Monday pre-carrier | High | Canonical field should distinguish file ID from claim number. |
| 28 | Adjuster Name | adjuster.display_name | Match After Normalization | Carrier-scoped resolver | O/future carrier | Medium | Shared names and changes over time? |
| 29 | Adj. Phone | adjuster phone evidence | Partial Match | Normalize privately | O/future carrier | Medium | Current vs historical contact? |
| 30 | Adj. Extension | adjuster extension | Partial Match | Trim digits/text | O/future carrier | Medium | — |
| 31 | Adjuster Email | adjuster.normalized_email | Match After Normalization | Lowercase/validate privately | O/future carrier | Medium | 42.06% coverage. |
| 32 | Main Claims Email | carrier contact evidence | Partial Match | Normalize privately | O/future carrier | Medium | Carrier-level or claim-specific mailbox? |
| 33 | CTR Rep | file_assignment sales_rep candidate | Match After Normalization | Identity resolver | Monday/CRM future | Medium | Contractor rep or client sales rep? |
| 34 | CTR Rep Email | user/contact email evidence | Partial Match | Normalize privately | CRM future | Medium | Only 7.48% coverage. |
| 35 | Closed Date | claim_file.completed_at candidate | Match After Normalization | Excel date parse | Monday pre-O | High | Does Closed cover both canonical completion statuses? |
| 36 | Reopen - Supplement | lifecycle reopen evidence | Partial Match | Parse date/value; review | Monday | Medium | Date, flag, or supplement identifier? |
| 37 | Days Opened | derived cycle time | Match After Normalization | Parse number, never Excel date | Canonical calculation | High | Define start/end dates. |
| 38 | Support | staff/support evidence | Ambiguous | Retain raw; resolver if identity | Monday | Low | Person, team, or boolean? |
| 39 | CRM Email | client/contact evidence | Partial Match | Normalize privately | CRM future | Low | Which entity owns it? |
| 40 | CRM FILE # | external_file_id/source key | Partial Match | Preserve text | CRM future | Medium | Is this stable and unique? |
| 41 | Timeline - Start | lifecycle/source milestone | Partial Match | Date parse | Monday | Low | Entirely blank on claims. |
| 42 | Timeline - End | lifecycle/source milestone | Partial Match | Date parse | Monday | Low | Entirely blank on claims. |
| 43 | Invoicing Notes | staff_observation/source note | Partial Match | Retain as text, no financial extraction | Human/Monday | Low | Should future invoices supersede? |
| 44 | Days in Status | derived status duration | Match After Normalization | Numeric validation | Canonical calculation | Medium | Requires status event boundaries. |
| 45 | link to [Dup]Claim Handling | source relationship link | Ambiguous | Validate link; provenance only | Monday | Low | Duplicate board relationship semantics? |
| 46 | CH Update (second) | — | Ambiguous | Deterministically name `CH Update__2` | Monday | Low | Entirely blank; why exported twice? |
| 47 | LAST UPDATE | source operational timestamp | Partial Match | Parse date, define source | Monday | Medium | Computed aggregate or manual entry? |
| 48 | CALL RECAP - SUBITEM | staff observation/update evidence | Partial Match | Preserve text; no fact extraction | Human/Monday | Low | Relation to nested subitems? |
| 49 | Next Step Date | operational task date | Unmapped Source Field | Parse date | Monday | High | Future task/action entity? |
| 50 | Property Address | claim_file loss address | Exact Match | Normalize/protect | O | High | Only 26.64% claim coverage; Name may duplicate. |
| 51 | Homeowner Name | claim_file homeowner_reference_name | Exact Match | Protect | O | High | Entirely blank in this export. |
| 52 | New Files | source workflow marker | Ambiguous | Retain raw | Monday | Low | Entirely blank on claims. |
| 53 | Outstanding | invoice outstanding balance candidate | Partial Match | Money parse only after meaning confirmed | Accounting future | Low | Entirely blank. |
| 54 | Updated RCV | financial fact candidate | Partial Match | Money parse | O | Low | Entirely blank on claims. |
| 55 | Next Action | operational task text | Unmapped Source Field | Preserve text | Human/Monday | Medium | Future action model? |
| 56 | Last AI Update | AI draft metadata | Future / Not Applicable | Preserve only if populated | Future governed service | Low | Entirely blank; no runtime AI assumption. |
| 57 | Admin Notes/Next action | staff_observation/action evidence | Partial Match | Preserve text, separate fact from observation | Human/Monday | Medium | Split observation and task later? |
| 58 | Priority | operational priority | Partial Match | Enum mapping | O | Low | Entirely blank. |
| 59 | Claim Health | derived/estimated assessment | Partial Match | Trust envelope required | Future metric | Low | Entirely blank. |
| 60 | Run Review | review workflow flag | Unmapped Source Field | Normalize boolean/status | O | Low | Entirely blank. |
| 61 | Item ID (auto generated) | claim_file external source ID | Exact Match | Preserve text | Monday | High | 214/214 unique. |

## Nested subitem row schema

The repeated row labeled `Subitems` defines a different header beginning at archive position 2. Its visible fields include subitem name, status, people, completion date, timeline, and Item ID. The 1,359 following detail rows must be parsed with that nested header, not the claim header. Parent association is positional because the subitem rows do not repeat the parent claim ID.

Mapping status: **Ready with Review Queue**. C1 may stage all subitems and preserve parent-row provenance, but should promote only well-defined subitem facts after the repeated header schema is formally inventoried and source-owner semantics are confirmed.

## Updates worksheet mappings

| Pos. | Source Field | Canonical Entity.Field | Status | Transformation | Authority | Confidence | Open question |
|---:|---|---|---|---|---|---|---|
| 1 | Item ID | source_record/claim relationship | Exact Match | Preserve text; resolve or quarantine | Monday | High | 56 referenced IDs are outside archived claims. |
| 2 | Item Name | source display snapshot | Partial Match | Protect/redact; do not use as identity | Monday | Medium | 226 names vs 270 item IDs. |
| 3 | Content Type | update content type | Exact Match | Rename first duplicate by position | Monday | High | Values identify updates. |
| 4 | Content Type (second) | reply content type | Exact Match | Rename `Content Type__2` | Monday | High | Populated on reply rows. |
| 5 | User | update author evidence | Match After Normalization | Staff identity resolver; blank→system/unattributed | Monday | Medium | Some generated email rows have no author. |
| 6 | Created At | update created timestamp | Match After Normalization | Parse text; retain raw; timezone unresolved | Monday | High | Which timezone generated export? |
| 7 | Update Content | immutable update body | Exact Match | Normalize line endings for comparison only | Monday | High | 12 blank bodies; rich email patterns. |
| 8 | Likes Count | update reaction count | Exact Match | Integer parse | Monday | High | Not needed in initial canonical slice. |
| 9 | Asset IDs | update asset references | Partial Match | Split/retain IDs, no fetch | Monday | Medium | Asset export/access model? |
| 10 | Post ID | update source ID | Exact Match | Preserve text | Monday | High | 5,957/5,957 unique. |
| 11 | Parent Post ID | update parent source ID | Exact Match | Resolve within update set or issue | Monday | High | 1,629 populated. |

## Canonical fields not present

| Canonical family | Missing source fields | Classification |
|---|---|---|
| Tenant/master hierarchy | tenant ID, parent organization, explicit branch | Canonical Field Not Present |
| Claim classification | explicit service type, property type, canonical status group | Canonical Field Not Present / derived |
| Full lifecycle | event-level entered/exited timestamps and actors | Canonical Field Not Present |
| Assignment history | start/end/assigner for estimator, claim handler, sales roles | Canonical Field Not Present |
| Financial availability | explicit five-state status per field | Canonical Field Not Present |
| Invoice facts | invoice ID/number/date/due date, charge lines, currency, invoice total | Canonical Field Not Present |
| Collection facts | amount collected, allocations, refunds, disputes, fees, net | Canonical Field Not Present |
| Future financials | ACV, deductible, depreciation, prior payments, contract, settlement | Canonical Field Not Present |
| Import metadata | parser/transformation versions and artifact hash | Generated by future importer |
| Knowledge governance | confidence, review, publication, evidence | Future / Not Applicable |
| Weather | event IDs, provider evidence, match version | Future / Not Applicable |

## Source fields not anticipated explicitly

The architecture needs no immediate new canonical entity, but C1 staging must accommodate:

- hierarchical subitem rows and repeated nested headers;
- operational milestones such as `Est. Sent`, `Next Step Date`, and `Next Action`;
- external system links (`CRM`, CompanyCam, duplicate claim-handling board);
- source review fields (`Run Review`, Claim Health, Priority);
- update assets and reply threading.

These should remain source records or staged fields until their business semantics are approved. No architecture change was made.

## Source authority reconsiderations

1. Monday can be authoritative for the archived snapshot, but not for future canonical invoice/cash facts.
2. `Additional Secured $` is internally consistent, yet canonical authority should remain the versioned calculation from initial and current/final RCV.
3. `Current Ins. RCV` is a strong final-RCV candidate for completed files, but the name does not prove final settlement.
4. `Closed Date` is a completion candidate, not complete status history.
5. `Client Fee` should not be labeled invoiced or collected revenue until accounting/Stripe facts exist.
