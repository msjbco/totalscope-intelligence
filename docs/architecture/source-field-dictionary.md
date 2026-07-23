# Enterprise Source Field Dictionary

This is the permanent business glossary for canonical TotalScope Intelligence fields. Source, authority, readiness, and detailed validation are cross-referenced in the [Canonical Source Mapping Matrix](canonical-source-mapping-matrix.md).

Conventions: money is integer minor units with ISO currency; timestamps are UTC; `quarter` means calendar quarter `YYYY Qn`; UUIDs are immutable canonical identifiers. Examples are illustrative, not actual TotalScope data.

## Shared audit and provenance fields

These fields apply to tenant-scoped canonical entities unless explicitly excluded.

| Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `tenant_id` | Security and ownership boundary used to prevent cross-client access. | UUID | no | tenant registry | All tenant-scoped references must agree. Example `01J…` | Enforce through database and service policies |
| `created_at` | Canonical record creation time. | timestamptz | no | platform clock | UTC, immutable | — |
| `updated_at` | Latest canonical mutation time. | timestamptz | no | operational system | not before creation | Does not replace source update time |
| `archived_at` | Soft-retirement time. | timestamptz | yes | operational system | after creation | Financial/provenance facts are not hard-deleted |
| `source_system` | Originating system key. | enum | imported records only | import declaration | approved source vocabulary; example `monday` | Extend through governed registry |
| `source_record_id` | Immutable source-row identity. | text/UUID | imported records only | source/import registry | unique within job/source | — |
| `import_job_id` | Ingestion execution that introduced the fact. | UUID | imported records only | import registry | existing job, same tenant | — |
| `source_updated_at` | Timestamp reported by the source. | timestamptz | yes | source | valid timestamp | Keep distinct from ingestion time |

## Organizations, branches, users, and access

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `organization.organization_id` | Canonical organization identity used by all associations. | UUID | no | O | unique, immutable | — |
| `organization.parent_organization_id` | Optional parent brand or enterprise organization. | UUID | yes | O | same tenant; no cycles | Supports brand hierarchy |
| `organization.organization_type` | Business classification controlling presentation, not special workflow. | enum: client, brand, law_firm, carrier, contractor, other | no | O | approved value | Law firm remains generic in V1 |
| `organization.legal_name` | Registered or authoritative organization name. | text | no | O/CRM future | trimmed, nonblank | May differ from display name |
| `organization.display_name` | User-facing organization name. | text | no | O | trimmed, nonblank | Alias search may be added |
| `organization.external_key` | Stable identifier in a source system. | text | yes | source | unique per tenant/source | Multiple-source keys may become child entity |
| `organization.status` | Operational availability of organization. | enum: active, inactive, archived | no | O | approved transition | — |
| `branch.branch_id` | Canonical branch identity. | UUID | no | O | unique, immutable | — |
| `branch.organization_id` | Owning organization. | UUID | no | O | organization exists, same tenant | — |
| `branch.branch_code` | Stable short branch reference. | text | no | O | unique within organization; example `DAL-01` | — |
| `branch.branch_name` | Human-readable branch name. | text | no | O | normalized aliases; example `Dallas` | — |
| `branch.status` | Branch lifecycle state. | enum: active, inactive, archived | no | O | approved transition | — |
| `user_account.user_account_id` | Login account identity; not inferred as a physical-person master. | UUID | no | identity service future | immutable | Different emails remain different accounts |
| `user_account.branch_id` | Single branch membership for a client account. | UUID | client: no; TSI: yes | identity/O | same tenant | Broader scope comes from grants, not multiple branches |
| `user_account.email` | Unique login and contact address. | case-insensitive text | no | identity service future | normalized, one account per email | — |
| `user_account.display_name` | Account-facing name. | text | no | identity service | trimmed | Not a merge key |
| `user_account.account_type` | Separates client and TotalScope account vocabularies. | enum: client, totalscope | no | O | approved value | — |
| `user_account.status` | Authentication lifecycle state. | enum: invited, active, suspended, archived | no | identity service | approved transition | Future authentication |
| `platform_role.role_key` | Administrative permission bundle. | approved client/TSI role enum | no | authorization policy | valid for audience | Independent of business function |
| `platform_role.audience` | Role vocabulary owner. | enum: client, totalscope | no | authorization policy | role/audience compatible | — |
| `role_assignment.role_grant_id` | Immutable role-grant event identity. | UUID | no | authorization service | unique | — |
| `role_assignment.user_account_id` | Account receiving permission. | UUID | no | authorization service | active account, same tenant | — |
| `role_assignment.role_key` | Granted platform role. | enum | no | authorization service | approved vocabulary | — |
| `role_assignment.granted_at` | Role effective start. | timestamptz | no | authorization service | valid UTC | — |
| `role_assignment.revoked_at` | Role effective end. | timestamptz | yes | authorization service | after grant | Null means active |
| `role_assignment.granted_by_user_account_id` | Audited grantor. | UUID | yes | authorization service | grantor authorized | Required for production |
| `business_function_grant.business_function` | Operational function, independent of platform permission. | Sales Manager, Sales Rep, Claim Handler, Billing Manager, or approved TSI function | no | O/CRM | approved vocabulary | May be multi-valued |
| `business_function_grant.effective_range` | Period during which function applies. | timestamp range | no | O | ordered; duplicate active ranges prohibited | — |

## Claim file

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `claim_file.file_id` | Canonical TotalScope file identity used for joins and Stripe metadata. | UUID | no | O | unique, immutable | Suggested Stripe metadata |
| `claim_file.external_file_id` | Human/source file reference. | text | no | Monday then O | unique in tenant/source; example `TS-1042` | — |
| `claim_file.client_organization_id` | Client organization responsible for file. | UUID | no | O | same tenant | — |
| `claim_file.branch_id` | Submitting client branch. | UUID | no | O | belongs to client organization | — |
| `claim_file.service_type` | Determines operational lifecycle. | enum: estimate_only, claim_handling | no | Monday then O | approved value | — |
| `claim_file.property_type` | Broad property classification. | enum: residential, commercial, unknown | no | O | blanks normalize to unknown | — |
| `claim_file.current_status` | Current workflow state projection. | approved lifecycle enum | no | O; Monday pre-O | valid for service type | Rebuildable from history |
| `claim_file.status_group` | Analytical grouping of status. | enum: open, completed, exception | no | derived | definition-versioned map | Do not import as fact |
| `claim_file.submitted_at` | Time file entered TotalScope workflow. | timestamptz | no | Monday then O | not after completion | Basis for submission cohort |
| `claim_file.completed_at` | First qualifying completion time under approved reopen policy. | timestamptz | yes | status history/O | not before submission; terminal-compatible | Reopen policy remains open |
| `claim_file.rejected_at` | Time file entered Rejected. | timestamptz | yes | status history/O | requires rejected transition | — |
| `claim_file.withdrawn_at` | Time file entered Withdrawn. | timestamptz | yes | status history/O | requires withdrawn transition | — |
| `claim_file.carrier_id` | Canonical carrier association. | UUID | yes | carrier alias resolver/O | carrier exists | Future carrier API evidence |
| `claim_file.current_adjuster_id` | Current carrier adjuster projection. | UUID | yes | adjuster history/O | carrier/effective-date compatible | — |
| `claim_file.homeowner_reference_name` | Restricted reference label; not an account identity. | text | yes | source/O | protected, trimmed | Retention decision required |
| `claim_file.loss_address_line1` | Restricted physical loss location. | text | yes | source/O | normalized address | Future geocoding |
| `claim_file.loss_city` | Loss-location city. | text | yes | source/geocoder | normalized casing | — |
| `claim_file.loss_county` | County used for geography and weather matching. | text | yes | approved geocoder | valid county/state | Future weather integrations |
| `claim_file.loss_state` | USPS state abbreviation. | char(2) | yes | O/geocoder | valid USPS value; example `TX` | — |
| `claim_file.loss_zip` | Postal code preserving leading zeros. | text | yes | O/geocoder | ZIP or ZIP+4; example `02108` | Never numeric |
| `claim_file.loss_date` | Reported date of property loss. | date | yes | O/future carrier | plausible, not future on capture | — |
| `claim_file.source_archive_quarter` | Quarter label of source archive, independent of business dates. | quarter | imported records: no | archive manifest | valid calendar quarter | Immutable provenance |
| `claim_file.submission_quarter` | Calendar quarter containing submission. | quarter | no | derived | from submitted date/timezone | — |
| `claim_file.completion_quarter` | Calendar quarter containing qualifying completion. | quarter | yes | derived | from completed date/timezone | — |

## Status and assignment history

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `file_status_history.status_history_id` | Immutable lifecycle event identity. | UUID | no | O/import | unique | — |
| `file_status_history.file_id` | File whose state changed. | UUID | no | canonical claim | file exists | — |
| `file_status_history.status` | State effective during history interval. | lifecycle enum | no | O/Monday | service-compatible | — |
| `file_status_history.entered_at` | Start of status interval. | timestamptz | no | source/O | ordered | — |
| `file_status_history.exited_at` | End of status interval. | timestamptz | yes | source or safe derivation | after entered; one open interval | Null means current |
| `file_status_history.duration_seconds` | Elapsed time in status. | bigint | yes | derived | nonnegative; requires exit | KPI input |
| `file_status_history.import_job_id` | Import provenance for historical event. | UUID | imported only | import registry | same tenant | — |
| `file_status_history.source_updated_at` | Source-reported change timestamp. | timestamptz | yes | source | valid UTC | — |
| `file_assignment.assignment_id` | Immutable assignment interval identity. | UUID | no | O/import | unique | — |
| `file_assignment.file_id` | Assigned file. | UUID | no | canonical claim | file exists | — |
| `file_assignment.assignment_type` | Operational responsibility. | estimator, claim_handler, sales_rep, sales_manager | no | O/source mapping | approved value | — |
| `file_assignment.assignee_user_account_id` | Account responsible during interval. | UUID | no | O/identity resolver | eligible account | — |
| `file_assignment.started_at` | Assignment effective start. | timestamptz | no | source/O | ordered | — |
| `file_assignment.ended_at` | Assignment effective end. | timestamptz | yes | O/source | after start | Null means current |
| `file_assignment.is_current` | Projection identifying open assignment. | boolean | no | derived | one true per file/type | — |
| `file_assignment.assigned_by_user_account_id` | Actor authorizing assignment. | UUID | yes | O | authorized actor | Required when future O captures |
| `file_adjuster_history.adjuster_id` | Carrier adjuster effective for file. | UUID | no | source/O | resolved identity | — |
| `file_adjuster_history.effective_range` | Adjuster assignment period. | timestamp range | no | source/O | nonoverlapping current range | — |

## Carrier and adjuster masters

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `carrier.carrier_id` | Canonical carrier identity independent of source spelling. | UUID | no | canonical alias registry | unique, immutable | — |
| `carrier.canonical_name` | Approved display and grouping name. | text | no | canonical alias registry | normalized, nonblank | Source labels remain aliases |
| `carrier.naic_code` | Standard carrier identifier where available. | text | yes | future reference/API | valid and unique | Future |
| `carrier.status` | Reference lifecycle state. | active, inactive, merged | no | canonical registry | approved transition | Future |
| `adjuster.adjuster_id` | Canonical adjuster identity within approved resolution scope. | UUID | no | O/resolver | immutable | No name-only merging |
| `adjuster.carrier_id` | Carrier association for adjuster. | UUID | yes | O/future carrier API | carrier exists | Effective history may be needed |
| `adjuster.display_name` | Adjuster’s source/display name. | text | no | source/O | trimmed | Not an identity key |
| `adjuster.normalized_email` | Normalized professional email when supplied. | case-insensitive text | yes | source/O | valid email | Resolver evidence |
| `adjuster.status` | Adjuster reference state. | active, inactive, unknown | no | O | approved value | Future |

## Financials, invoices, and charges

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `file_financial.financial_availability_status` | Declares whether file financials are usable. | captured, partially_captured, not_captured, invalid, not_applicable | no | O/review | approved value | Required even when amounts null |
| `file_financial.initial_carrier_rcv_minor` | Initial carrier replacement-cost position. | bigint money | yes | O/source | valid currency; null not zero | Future carrier/Xactimate |
| `file_financial.final_rcv_minor` | Final replacement-cost position. | bigint money | yes | O/source | valid currency | — |
| `file_financial.additional_rcv_minor` | Increment from initial to final RCV. | bigint money | yes | derived | final minus initial exactly | May be negative if business policy permits |
| `file_financial.acv_minor` | Actual cash value. | bigint money | yes | future carrier/Xactimate | explicit availability | Future |
| `file_financial.deductible_minor` | Policyholder deductible. | bigint money | yes | O/future carrier | nonnegative | Future enrichment |
| `file_financial.recoverable_depreciation_minor` | Depreciation potentially recoverable. | bigint money | yes | future carrier/Xactimate | nonnegative | Future |
| `file_financial.nonrecoverable_depreciation_minor` | Depreciation not recoverable. | bigint money | yes | future carrier/Xactimate | nonnegative | Future |
| `file_financial.prior_carrier_payments_minor` | Carrier amounts paid before final settlement. | bigint money | yes | future carrier/accounting | nonnegative | Future |
| `file_financial.contractor_contract_amount_minor` | Contractor’s agreed contract value. | bigint money | yes | source/future builder | nonnegative | — |
| `file_financial.final_settlement_minor` | Final claim settlement amount. | bigint money | yes | O/future carrier | explicit status and currency | — |
| `invoice.invoice_id` | Canonical invoice identity. | UUID | no | accounting/O | unique | Suggested Stripe metadata |
| `invoice.invoice_number` | Human-facing invoice reference. | text | no | accounting/O | unique per tenant | — |
| `invoice.file_id` | File billed by invoice. | UUID | no | O | same tenant | Current model: one file per invoice |
| `invoice.invoice_date` | Date receivable is issued. | date | no | accounting/O | valid date | Invoiced-revenue cohort |
| `invoice.due_date` | Contractual due date. | date | yes | accounting/O | on/after invoice date | Due-quarter cohort |
| `invoice.currency_code` | Currency for invoice and allocations. | ISO 4217 char(3) | no | accounting/O | approved currency | No silent conversion |
| `invoice.invoice_amount_minor` | Sum of active charge lines. | bigint money | no | charge calculation | equals line sum | — |
| `invoice.amount_collected_minor` | Settled allocated cash net of approved refund policy. | bigint money | no | derived | reconcile to allocations | Not source “paid” summary |
| `invoice.outstanding_balance_minor` | Remaining receivable. | bigint money | no | derived | invoice less collections/adjustments | — |
| `invoice.invoice_quarter` | Invoice-date calendar quarter. | quarter | no | derived | valid invoice date | — |
| `invoice.due_quarter` | Due-date calendar quarter. | quarter | yes | derived | valid due date | — |
| `invoice_charge.charge_type` | Classification of billed service/cost. | estimate_fee, claim_handling_fee, eagleview_report, walls_report, additional_charge, other | no | O/accounting | approved value | — |
| `invoice_charge.amount_minor` | Monetary amount of charge line. | bigint money | no | O/accounting | line balances invoice | — |
| `invoice_charge.estimate_fee_minor` | Source-column representation mapped to estimate-fee line. | bigint money | yes | source | charge type match | Canonical storage should use charge lines |
| `invoice_charge.claim_handling_fee_minor` | Source-column claim-handling fee. | bigint money | yes | source | charge type match | — |
| `invoice_charge.eagleview_fee_minor` | Billed EagleView report cost. | bigint money | yes | source | source amount; no $40 assumption | — |
| `invoice_charge.walls_fee_minor` | Billed Walls report cost. | bigint money | yes | source | source amount; no default range | — |
| `invoice_charge.additional_charges_minor` | Extra reason-coded charges. | bigint money | yes | source/O | description required | — |
| `invoice_charge.other_charge_minor` | Uncategorized governed charge. | bigint money | yes | source/O | description required | Reduce use through taxonomy |

## Stripe and reconciliation

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `payment.payment_id` | Canonical processor payment identity. | UUID | no | Stripe/import registry | unique processor reference | — |
| `payment.processor_customer_id` | Stripe customer reference used in matching. | text | yes | Stripe | valid source ID | Not canonical organization ID |
| `payment.gross_amount_minor` | Gross processor payment. | bigint money | no | Stripe | valid currency/minor units | — |
| `payment.processor_fee_minor` | Stripe fee attributable to payment. | bigint money | yes | Stripe balance transaction | nonnegative | — |
| `payment.net_amount_minor` | Processor-reported net cash. | bigint money | no | Stripe | reconcile to report semantics | — |
| `payment.payment_at` | Processor payment/settlement event date per approved policy. | timestamptz | no | Stripe | valid UTC | Collection lens policy required |
| `payment.available_at` | Date funds become available. | timestamptz | yes | Stripe | on/after creation | Alternative cash lens |
| `payment.collection_quarter` | Calendar quarter of selected payment date. | quarter | no | derived | definition-versioned | — |
| `payment.metadata_json` | Immutable Stripe metadata snapshot. | JSON | yes | Stripe | size and key controls | Suggested canonical IDs |
| `refund.refund_id` | Processor refund identity. | UUID | no | Stripe | unique | — |
| `refund.amount_minor` | Refunded amount. | bigint money | no | Stripe | positive, within refundable amount | — |
| `refund.refunded_at` | Refund event time. | timestamptz | no | Stripe | valid UTC | — |
| `dispute.dispute_id` | Processor dispute identity. | UUID | no | Stripe | unique | — |
| `dispute.amount_minor` | Disputed amount. | bigint money | no | Stripe | currency-compatible | — |
| `dispute.status` | Processor dispute state. | Stripe-normalized enum | no | Stripe | approved mapping | Preserve raw status |
| `processor_fee.processor_fee_id` | Canonical Stripe fee identity. | UUID | no | Stripe/import registry | unique processor ID | — |
| `processor_fee.payment_id` | Payment incurring the fee. | UUID | no | Stripe relation | payment exists | — |
| `processor_fee.amount_minor` | Processor fee amount. | bigint money | no | Stripe | nonnegative, currency-compatible | — |
| `processor_fee.assessed_at` | Time processor assessed fee. | timestamptz | no | Stripe | valid UTC | — |
| `payment_allocation.allocation_id` | Audited application of payment to invoice. | UUID | no | reconciliation system | unique event | Many-to-many bridge |
| `payment_allocation.payment_id` | Source payment. | UUID | no | canonical payment | exists | — |
| `payment_allocation.invoice_id` | Target invoice. | UUID | no | reconciliation result | exists, same tenant/currency | — |
| `payment_allocation.allocated_amount_minor` | Amount applied to target invoice. | bigint money | no | reviewer/rule | does not exceed payment availability or invoice balance | — |
| `payment_allocation.match_method` | Winning match-hierarchy method. | exact_invoice_id, exact_file_id, metadata, customer_amount_window, organization_amount_window, manual | no | reconciliation engine | approved value | — |
| `payment_allocation.match_confidence` | Deterministic confidence in match. | numeric 0–1 | no | reconciliation rule | range; rule version recorded | Not AI confidence |
| `reconciliation_issue.reconciliation_issue_id` | Auditable exception identity. | UUID | no | reconciliation system | unique | — |
| `reconciliation_issue.issue_type` | Machine-readable mismatch category. | governed enum | no | reconciliation rules | approved vocabulary | — |
| `reconciliation_issue.status` | Review lifecycle. | open, in_review, resolved, accepted_exception | no | reconciliation workflow | valid transition | — |
| `reconciliation_issue.severity` | Operational impact. | info, warning, error, critical | no | rule version | approved value | — |
| `reconciliation_issue.candidate_json` | Bounded set of potential matches and evidence. | JSON | yes | matcher | tenant-safe, reproducible | May normalize later |
| `reconciliation_issue.resolved_by_user_account_id` | Authorized reviewer. | UUID | yes | workflow | required when manually resolved | — |
| `reconciliation_issue.resolution_reason` | Human explanation of outcome. | text | yes | reviewer | required for resolution | — |

## Imports and lineage

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `import_job.import_job_id` | Immutable import execution identity. | UUID | no | import registry | unique | — |
| `import_job.source_system` | Declared origin. | governed enum | no | import declaration | approved source | — |
| `import_job.import_version` | Parser software version. | semantic text | no | importer | immutable/resolvable | — |
| `import_job.transformation_version` | Mapping/normalization ruleset version. | semantic text | no | mapping registry | immutable/resolvable | — |
| `import_job.source_filename` | Safe display name of artifact. | text | no | artifact registry | sanitized | Not a storage path |
| `import_job.source_artifact_hash` | Content identity and idempotency key. | SHA-256 text | no | ingestion | valid hash, unique in scope | — |
| `import_job.source_archive_quarter` | Quarter declared by archive. | quarter | yes | manifest | valid syntax | Not derived from row dates |
| `import_job.imported_at` | Platform ingestion time. | timestamptz | no | platform clock | UTC | — |
| `import_job.status` | Import state. | received, parsing, staged, promoted, partial, failed | no | orchestrator | valid transition | Future runtime |
| `source_record.source_record_id` | Source row/event identity. | UUID/text | no | source/registry | unique per job | — |
| `source_record.source_row_json` | Immutable raw source representation or protected pointer. | JSON/pointer | no | artifact | hash-verifiable | Security/retention controls |
| `source_record.source_updated_at` | Source’s own update time. | timestamptz | yes | source | valid UTC | — |
| `provenance_link.canonical_entity` | Entity receiving source evidence. | governed text | no | promotion | entity exists | — |
| `provenance_link.canonical_field` | Field receiving source evidence. | governed text | no | mapping registry | dictionary field exists | — |
| `provenance_link.source_field_path` | Exact source column or JSON path. | text | no | mapping | nonblank | — |

## Intelligence content

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `knowledge_item.knowledge_item_id` | Canonical governed content identity. | UUID | no | editorial service | unique | Future |
| `knowledge_item.category` | Intelligence taxonomy. | governed enum | no | reviewed content | approved category | Future |
| `knowledge_item.title` | Human-readable article heading. | text | no | reviewed content | nonblank/length limit | Future |
| `knowledge_item.body` | Structured reviewed content. | structured text | no | reviewed content | sanitized, evidence-linked | Future |
| `knowledge_item.confidence` | Reviewer assessment of support. | governed enum | no | author/reviewer | approved vocabulary | Not metric confidence |
| `knowledge_item.review_status` | Editorial review stage. | draft, in_review, approved | no | editorial workflow | valid transition | Future |
| `knowledge_item.publication_status` | Audience publication state. | unpublished, published, retired | no | Content Publisher | valid transition | Future |
| `knowledge_item.published_at` | Publication time. | timestamptz | yes | editorial service | requires published state | Future |
| `staff_observation.observation_id` | Immutable authored operational observation. | UUID | no | O/editorial | unique | Future |
| `staff_observation.author_user_account_id` | Account responsible for statement. | UUID | no | identity/editorial | author exists | — |
| `staff_observation.observed_at` | Time context was observed. | timestamptz | no | human/source | valid UTC | — |
| `staff_observation.statement` | Human interpretation, explicitly not a measured fact. | text | no | human-reviewed content | evidence and scope required | — |
| `staff_observation.scope_json` | Tenant-safe subjects and periods to which observation applies. | JSON | no | reviewed content | referenced targets exist | May normalize to link table |

## Weather and knowledge support

| Entity.Field | Business definition and purpose | Type / allowed values | Nullable | Source / authority | Validation and example | Future notes |
|---|---|---|---:|---|---|---|
| `weather_event.weather_event_id` | Canonical weather-event identity. | UUID | no | approved provider/registry | unique | Future integration |
| `weather_event.provider_event_id` | Provider’s stable event reference. | text | no | weather provider | unique per provider | Future |
| `weather_event.event_type` | Governed event classification. | weather enum | no | weather provider | mapped vocabulary | Future |
| `weather_event.started_at` | Event start time. | timestamptz | no | weather provider | valid UTC | Future |
| `weather_event.ended_at` | Event end time. | timestamptz | yes | weather provider | not before start | Future |
| `weather_event.geography_json` | Provider geometry or jurisdiction evidence. | geography/JSON | no | weather provider | valid geometry | Future |
| `weather_event.severity` | Provider-defined event magnitude. | text/enum | yes | weather provider | scale/version retained | Do not compare incompatible scales |
| `file_weather_match.file_weather_match_id` | Versioned match-result identity. | UUID | no | matcher | unique per file/event/version | Future |
| `file_weather_match.file_id` | Candidate claim file. | UUID | no | canonical claim | file exists | Future |
| `file_weather_match.weather_event_id` | Candidate event. | UUID | no | canonical event | event exists | Future |
| `file_weather_match.match_version` | Matching algorithm/rule version. | text | no | matcher | resolvable | Future |
| `file_weather_match.match_confidence` | Deterministic evidence strength. | numeric 0–1 | no | matcher | bounded | Does not establish causation |
| `file_weather_match.evidence_json` | County, ZIP, and time-window evidence. | JSON | no | matcher | source-linked | Future |
| `knowledge_revision.knowledge_revision_id` | Immutable content revision identity. | UUID | no | editorial service | unique | Future |
| `knowledge_revision.knowledge_item_id` | Revised article. | UUID | no | editorial service | parent exists | Future |
| `knowledge_revision.revision_number` | Ordered version. | positive integer | no | editorial service | unique per item | Future |
| `knowledge_revision.body` | Exact content for revision. | structured text | no | reviewed content | sanitized | Future |
| `knowledge_evidence.knowledge_evidence_id` | Evidence-link identity. | UUID | no | editorial service | unique | Future |
| `knowledge_evidence.knowledge_item_id` | Supported article. | UUID | no | editorial service | parent exists | Future |
| `knowledge_evidence.evidence_type` | Kind of support. | source_fact, metric, external_reference, observation | no | editorial taxonomy | approved value | Future |
| `knowledge_evidence.evidence_reference` | Resolvable, tenant-safe evidence locator. | text/JSON | no | evidence registry | target exists and is accessible | Future |

## Trust metadata

Every published metric or important field result is wrapped by:

| Field | Definition | Allowed values / validation |
|---|---|---|
| `measurement_status` | Whether value is a source measurement or interpretation. | measured, derived, estimated, unavailable |
| `confidence_grade` | Overall fitness for stated use. | A, B, C, D, Limited |
| `coverage_percentage` | Eligible records divided by applicable records. | 0–100 with numerator/denominator |
| `source_count` | Distinct contributing source records. | nonnegative integer |
| `calculation_version` | Reproducible formula/ruleset identity. | required for derived/estimated |
| `validation_status` | Quality evaluation state. | valid, warning, invalid, not_evaluated |
| `evaluated_at` | Time trust envelope was computed. | UTC timestamp |

Confidence never replaces validation, coverage, or lineage; all are required to answer whether a value is trustworthy.
