# Canonical Source Mapping Matrix

Status: definitive Phase B mapping contract; documentation only.

## How to read this matrix

Availability is always one of `Captured`, `Partially Captured`, `Calculated`, `Future`, `Unavailable`, or `Unknown`.

Import readiness:

- **Today:** direct import is possible.
- **Transform:** import requires a documented transformation or resolver.
- **Manual:** governed entry or review is required.
- **Future:** reserved integration.
- **Unavailable:** no approved source.

Source abbreviations: **M** Monday operational/archive export, **A** archive manifest or filename, **S** Stripe report/metadata, **O** future canonical operational system, **H** human-reviewed content, **F** reserved future integration. Blank source cells mean the source does not supply the field.

## Organizations and branches

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| organization | organization_id | UUID | item/account relation | | metadata client ID | O/CRM | no | yes | Calculated | O canonical ID | unique and immutable | Generated during canonical resolution; Transform |
| organization | tenant_id | UUID | board/account scope | archive tenant manifest | Stripe account mapping | O | no | yes | Calculated | tenant registry | must match every child record | Security boundary; Transform |
| organization | parent_organization_id | UUID | parent/brand column | | | CRM | no | no | Partially Captured | O after review | same tenant; no hierarchy cycle | Transform/manual review |
| organization | organization_type | enum | client/type column | | customer metadata | CRM | no | yes | Partially Captured | O | `client, brand, law_firm, carrier, contractor, other` | Alias map; Transform |
| organization | legal_name | text | client name | client name | customer name | CRM/accounting | no | yes | Captured | O after source resolution | trimmed, nonblank | Monday initial source; Transform |
| organization | display_name | text | client/brand name | | customer description | CRM | no | yes | Captured | O | trimmed, nonblank | Today/Transform |
| organization | external_key | text | account/item ID | source organization ID | customer ID | CRM | no | no | Partially Captured | source-specific | unique per tenant and source | Today |
| organization | status | enum | active/status | | customer state | O | no | yes | Partially Captured | O | `active, inactive, archived` | Transform |
| branch | branch_id | UUID | branch relation | | metadata branch ID | O/CRM | no | yes | Calculated | O | unique and immutable | Transform |
| branch | tenant_id | UUID | board scope | tenant manifest | account mapping | O | no | yes | Calculated | tenant registry | same tenant as organization | Transform |
| branch | organization_id | UUID | client/branch relation | organization key | customer mapping | CRM | no | yes | Partially Captured | O | referenced organization exists | Resolver required |
| branch | branch_code | text | branch code | | metadata branch ID | CRM | no | yes | Partially Captured | O | unique within organization | Normalize aliases; Transform |
| branch | branch_name | text | branch/location | | customer metadata | CRM | no | yes | Captured | O | trimmed; alias-resolved | Transform |
| branch | status | enum | status | | | O | no | yes | Partially Captured | O | `active, inactive, archived` | Transform |

## Users, roles, and grants

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| user_account | user_account_id | UUID | person relation | | | identity provider | no | yes | Calculated | future identity system | immutable | Transform; no person merge by name |
| user_account | tenant_id | UUID | board scope | tenant manifest | | identity provider | no | yes | Calculated | tenant registry | required tenant boundary | Transform |
| user_account | branch_id | UUID | branch/person relation | | | CRM | no | client only | Partially Captured | O | same tenant; at most one branch | Resolver |
| user_account | email | citext | person email | | customer email | identity provider/CRM | no | yes | Partially Captured | identity provider when implemented | normalized; one account per email | Transform/manual exceptions |
| user_account | display_name | text | person name | | customer name | identity provider | no | yes | Captured | identity provider | trimmed | Today |
| user_account | account_type | enum | team/client context | | | identity provider | no | yes | Calculated | O | `client, totalscope` | Transform |
| user_account | status | enum | active status | | | identity provider | no | yes | Partially Captured | identity provider | `invited, active, suspended, archived` | Future authoritative |
| platform_role | role_key | enum | role label | | | authorization service | no | yes | Partially Captured | authorization service | approved role vocabulary | Transform |
| platform_role | audience | enum | context | | | authorization service | no | yes | Calculated | architecture policy | `client, totalscope` | Transform |
| role_assignment | role_grant_id | UUID | | | | authorization service | no | yes | Future | authorization service | immutable | Future |
| role_assignment | user_account_id | UUID | person relation | | | authorization service | no | yes | Partially Captured | authorization service | user exists in tenant | Resolver/Future |
| role_assignment | role_key | enum | role/group | | | authorization service | no | yes | Partially Captured | authorization service | client: Super Admin/Admin/Oversight/None; TSI approved roles | Transform |
| role_assignment | granted_at | timestamptz | update timestamp | source timestamp | | authorization service | no | yes | Partially Captured | authorization service | valid UTC timestamp | Future authority |
| role_assignment | revoked_at | timestamptz | | | | authorization service | no | no | Future | authorization service | after `granted_at` | Future |
| role_assignment | granted_by_user_account_id | UUID | | | | authorization service | no | no | Future | authorization service | grantor authorized | Future |
| business_function_grant | business_function | enum | team/role column | | | CRM/authorization | no | yes | Partially Captured | O | approved function vocabulary | Transform |
| business_function_grant | effective_range | tstzrange | update history | | | O | no | yes | Future | O | nonoverlapping active duplicate grants | Future |

## Claims and status history

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| claim_file | file_id | UUID | item ID | source row/item ID | metadata file ID | O | no | yes | Calculated | O canonical ID | immutable, unique | Transform |
| claim_file | external_file_id | text | file/claim ID | file ID | metadata file ID | builder/CRM | no | yes | Captured | O after import | unique `(tenant, source)`; nonblank | Today |
| claim_file | tenant_id | UUID | board scope | tenant manifest | account map | O | no | yes | Calculated | tenant registry | tenant-consistent references | Transform |
| claim_file | client_organization_id | UUID | client relation | client field | customer/metadata | CRM | no | yes | Partially Captured | O | organization exists in tenant | Resolver |
| claim_file | branch_id | UUID | branch relation | branch field | metadata | CRM | no | yes | Partially Captured | O | branch belongs to organization | Resolver |
| claim_file | service_type | enum | service/type | service field | | O | no | yes | Captured | Monday until O | `estimate_only, claim_handling` | Alias transform |
| claim_file | property_type | enum | property type | property field | | builder integration | no | yes | Partially Captured | O | `residential, commercial, unknown` | Blank→unknown, not NULL |
| claim_file | current_status | enum | status | status field | | O | no | yes | Captured | Monday until O | lifecycle-valid for service type | Alias/collapse duplicates |
| claim_file | status_group | enum | | | | O | yes | yes | Calculated | definition version | map status to `open, completed, exception` | Derived |
| claim_file | submitted_at | timestamptz | submitted/created date | submitted date | | CRM/builder | no | yes | Captured | Monday until O | valid UTC; not after completion | Date transform |
| claim_file | completed_at | timestamptz | completed date/status update | completed date | | O | no | no | Partially Captured | status history/O | not before submitted; correct terminal status | Transform |
| claim_file | rejected_at | timestamptz | rejected update | rejected date | | O | no | no | Partially Captured | status history/O | requires Rejected status | Transform |
| claim_file | withdrawn_at | timestamptz | withdrawn update | withdrawn date | | O | no | no | Partially Captured | status history/O | requires Withdrawn status | Transform |
| claim_file | carrier_id | UUID | carrier column | carrier field | customer metadata | carrier API | no | no | Partially Captured | canonical carrier alias table | alias must resolve or issue | Transform |
| claim_file | current_adjuster_id | UUID | adjuster column | adjuster field | | carrier API | no | no | Partially Captured | O after review | adjuster identity valid for carrier/effective date | Resolver |
| claim_file | homeowner_reference_name | text | homeowner | homeowner | | builder integration | no | no | Partially Captured | source/O | trimmed; protected; not identity account | Restricted |
| claim_file | loss_address_line1 | text | loss address | address | | geocoding/builder | no | no | Partially Captured | O | normalized, protected | Transform |
| claim_file | loss_city | text | city/address | city | | geocoding | no | no | Partially Captured | O/geocoding-reviewed | canonical casing | Transform |
| claim_file | loss_county | text | county/address | county | | geocoding/weather API | no | no | Partially Captured | approved geocoder | county/state combination valid | Transform/Future |
| claim_file | loss_state | char(2) | state/address | state | | geocoding | no | no | Captured | O/geocoding-reviewed | USPS abbreviation | Transform |
| claim_file | loss_zip | varchar(10) | ZIP/address | ZIP | | geocoding | no | no | Captured | O/geocoding-reviewed | 5 or ZIP+4; preserve leading zero | Transform |
| claim_file | loss_date | date | date of loss | loss date | | carrier/builder API | no | no | Partially Captured | O, future carrier corroboration | plausible; not future at capture | Today/Transform |
| claim_file | source_archive_quarter | quarter | board/archive | filename/folder quarter | | | no | yes imported | Captured | archive manifest | calendar-quarter syntax | Today |
| claim_file | submission_quarter | quarter | | | | | yes | yes | Calculated | `submitted_at` | calendar-quarter derivation | Derived |
| claim_file | completion_quarter | quarter | | | | | yes | no | Calculated | `completed_at` | calendar-quarter derivation | Derived |
| file_status_history | status_history_id | UUID | activity/status history | status change columns/log | | O | no | yes | Partially Captured | O; archive provenance retained | immutable unique event | Transform |
| file_status_history | file_id | UUID | item ID | file ID | | O | no | yes | Captured | canonical claim | referenced file exists | Resolver |
| file_status_history | status | enum | status event | status event | | O | no | yes | Captured | Monday until O | lifecycle-valid | Transform |
| file_status_history | entered_at | timestamptz | activity timestamp | status entered | | O | no | yes | Partially Captured | source event | ordered per file | Transform |
| file_status_history | exited_at | timestamptz | next activity timestamp | status exited | | O | yes/no | no | Partially Captured | source when present, else derived | not before entered; one current open row | Derived only when next event reliable |
| file_status_history | duration_seconds | bigint | | | | | yes | no | Calculated | entered/exited | nonnegative; unavailable if exit absent | Derived |
| file_status_history | import_job_id | UUID | | archive import | | | no | imported only | Captured | import registry | job exists, same tenant | Today |
| file_status_history | source_updated_at | timestamptz | activity updated time | source update | | O | no | no | Partially Captured | source system | valid source timestamp | Today |

## Assignments and adjusters

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| file_assignment | assignment_id | UUID | person relation event | assignee fields | | O | no | yes | Calculated | O | immutable | Transform |
| file_assignment | file_id | UUID | item ID | file ID | | O | no | yes | Captured | canonical claim | file exists | Resolver |
| file_assignment | assignment_type | enum | column identity | source column | | O | no | yes | Captured | architecture vocabulary | `estimator, claim_handler, sales_rep, sales_manager` | Transform |
| file_assignment | assignee_user_account_id | UUID | person/email | assignee value | | identity/CRM | no | yes | Partially Captured | O | account exists and eligible | Resolver/manual |
| file_assignment | started_at | timestamptz | activity timestamp | assignment date | | O | no | yes | Partially Captured | source event | ordered; not after end | Transform |
| file_assignment | ended_at | timestamptz | reassignment event | | | O | no | no | Partially Captured | O/source history | after start; one current per type | Derived from next event when safe |
| file_assignment | is_current | boolean | current column value | | | O | yes | yes | Calculated | open effective range | exactly one current per file/type | Derived |
| file_assignment | assigned_by_user_account_id | UUID | activity actor | | | O | no | no | Partially Captured | O/source event | authorized actor if known | Manual/Future |
| file_adjuster_history | adjuster_id | UUID | adjuster relation | adjuster | | carrier API | no | yes | Partially Captured | canonical adjuster resolver | carrier-compatible identity | Transform |
| file_adjuster_history | effective_range | tstzrange | activity history | | | O/carrier API | no | yes | Partially Captured | O | nonoverlapping current assignment | Transform |

## Carrier and adjuster masters

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| carrier | carrier_id | UUID | carrier label | carrier | customer metadata | carrier API | no | yes | Calculated | canonical alias table | immutable, unique | Transform |
| carrier | canonical_name | text | carrier label | carrier | customer name | carrier API | no | yes | Captured | canonical alias table | normalized nonblank name | Transform |
| carrier | naic_code | text | | | | carrier API/reference | no | no | Future | approved carrier reference | valid NAIC format, unique when present | Future |
| carrier | status | enum | | | | carrier reference | no | yes | Future | canonical reference | `active, inactive, merged` | Future |
| adjuster | adjuster_id | UUID | adjuster label/email | adjuster | | carrier API | no | yes | Calculated | canonical resolver | immutable | Transform |
| adjuster | carrier_id | UUID | carrier + adjuster | carrier | | carrier API | no | no | Partially Captured | O/carrier API | carrier exists | Resolver |
| adjuster | display_name | text | adjuster name | adjuster | | carrier API | no | yes | Captured | O | trimmed; not sufficient to merge | Today |
| adjuster | normalized_email | citext | adjuster email | email | | carrier API | no | no | Partially Captured | O/carrier API | valid normalized email | Transform |
| adjuster | status | enum | | | | carrier API | no | yes | Future | O | `active, inactive, unknown` | Future |

## Financial facts, invoices, and charges

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| file_financial | financial_availability_status | enum | finance fields/status | finance status | | accounting | no | yes | Partially Captured | O/manual reviewed | approved five-state vocabulary | Transform |
| file_financial | initial_carrier_rcv_minor | bigint | initial RCV | initial RCV | metadata only | carrier/Xactimate | no | no | Partially Captured | O; source provenance retained | valid currency; NULL never→0 | Transform |
| file_financial | final_rcv_minor | bigint | final RCV | final RCV | metadata only | carrier/Xactimate | no | no | Partially Captured | O | valid currency; final date context | Transform |
| file_financial | additional_rcv_minor | bigint | sometimes supplied | additional RCV | | | yes | no | Calculated | calculation version | equals final minus initial | Compare supplied value; derived |
| file_financial | acv_minor | bigint | | | | carrier/Xactimate | no | no | Future | future approved source | explicit availability; currency | Future |
| file_financial | deductible_minor | bigint | sparse | deductible | | carrier/Xactimate | no | no | Partially Captured | O/future carrier | nonnegative; explicit status | Transform/Future |
| file_financial | recoverable_depreciation_minor | bigint | | | | carrier/Xactimate | no | no | Future | future approved source | nonnegative; explicit status | Future |
| file_financial | nonrecoverable_depreciation_minor | bigint | | | | carrier/Xactimate | no | no | Future | future approved source | nonnegative; explicit status | Future |
| file_financial | prior_carrier_payments_minor | bigint | | | | carrier/accounting | no | no | Future | future approved source | nonnegative; explicit status | Future |
| file_financial | contractor_contract_amount_minor | bigint | sparse | contract amount | | builder/accounting | no | no | Partially Captured | O/future accounting | nonnegative; currency | Transform/Future |
| file_financial | final_settlement_minor | bigint | sparse | settlement | | carrier/accounting | no | no | Partially Captured | O/future carrier | explicit status; currency | Transform/Future |
| invoice | invoice_id | UUID | invoice ID | invoice ID | metadata invoice ID | accounting | no | yes | Partially Captured | accounting/O | immutable; unique tenant invoice ID | Resolver |
| invoice | invoice_number | text | invoice number | invoice number | metadata/description | accounting | no | yes | Partially Captured | accounting/O | unique per tenant | Transform |
| invoice | file_id | UUID | file relation | file ID | metadata file ID | accounting | no | yes | Partially Captured | O | file exists, same tenant | Resolver |
| invoice | invoice_date | date | invoice date | invoice date | metadata | accounting | no | yes | Partially Captured | accounting/O | valid date; not before allowed service event policy | Transform |
| invoice | due_date | date | due date | due date | | accounting | no | no | Partially Captured | accounting/O | on/after invoice date | Transform |
| invoice | currency_code | char(3) | currency/default | currency | currency | accounting | no | yes | Partially Captured | accounting/O | ISO 4217; no silent conversion | Transform |
| invoice | invoice_amount_minor | bigint | invoice amount | invoice amount | payment description only | accounting | yes/check | yes | Partially Captured | active invoice charges | equals sum active charge lines | Import and reconcile |
| invoice | amount_collected_minor | bigint | sometimes paid amount | paid amount | allocations | accounting/Stripe | yes | yes | Calculated | settled payment allocations | allocations less refunds under versioned policy | Derived |
| invoice | outstanding_balance_minor | bigint | | | | accounting | yes | yes | Calculated | invoice and allocations | invoice amount minus collected/adjustments; never below policy floor | Derived |
| invoice | invoice_quarter | quarter | | | | | yes | yes | Calculated | invoice date | calendar-quarter derivation | Derived |
| invoice | due_quarter | quarter | | | | | yes | no | Calculated | due date | calendar-quarter derivation | Derived |
| invoice_charge | charge_type | enum | fee columns | fee columns | line description | accounting | no | yes | Partially Captured | O/accounting | approved type vocabulary | Transform |
| invoice_charge | amount_minor | bigint | fee value | fee value | | accounting | no | yes | Partially Captured | O/accounting | nonnegative unless approved credit line | Transform |
| invoice_charge | estimate_fee_minor | bigint | estimate fee | estimate fee | | accounting | no | no | Partially Captured | charge line | charge type `estimate_fee` | Pivot source columns |
| invoice_charge | claim_handling_fee_minor | bigint | claim fee | claim fee | | accounting | no | no | Partially Captured | charge line | type `claim_handling_fee` | Transform |
| invoice_charge | eagleview_fee_minor | bigint | EagleView | EagleView fee | | accounting/vendor | no | no | Partially Captured | charge line | source amount authoritative; no fixed default | Transform |
| invoice_charge | walls_fee_minor | bigint | Walls | Walls fee | | accounting/vendor | no | no | Partially Captured | charge line | source amount authoritative | Transform |
| invoice_charge | additional_charges_minor | bigint | additional charges | additional | | accounting | no | no | Partially Captured | charge lines | reason/description required | Transform |
| invoice_charge | other_charge_minor | bigint | other | other | | accounting | no | no | Partially Captured | charge lines | description required | Transform |

## Stripe, allocation, refunds, and disputes

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| payment | payment_id | UUID | | | payment_intent/charge ID | accounting | no | yes | Captured | Stripe for processor fact | unique processor ID | Today |
| payment | processor_customer_id | text | client relation | | customer ID | accounting/CRM | no | no | Captured | Stripe | well-formed source ID | Today |
| payment | gross_amount_minor | bigint | | | amount | accounting | no | yes | Captured | Stripe | integer minor units, currency present | Today |
| payment | processor_fee_minor | bigint | | | balance transaction fee | accounting | no | no | Captured | Stripe | nonnegative; linked transaction | Today |
| payment | net_amount_minor | bigint | | | net | accounting | yes/check | yes | Captured | Stripe balance transaction | gross-fees-refunds per report semantics | Validate |
| payment | payment_at | timestamptz | paid date | | created/paid_at | accounting | no | yes | Captured | Stripe | valid UTC; cannot precede matched invoice under normal policy | Today |
| payment | available_at | timestamptz | | | available_on | accounting | no | no | Captured | Stripe | on/after processor creation | Today |
| payment | collection_quarter | quarter | | | | | yes | yes | Calculated | settled payment date | calendar-quarter derivation | Derived |
| payment | metadata_json | jsonb | | | metadata snapshot | | no | no | Captured | Stripe | size/schema limits; immutable snapshot | Today |
| refund | refund_id | UUID | | | refund ID | accounting | no | yes | Captured | Stripe | unique; parent payment exists | Today |
| refund | amount_minor | bigint | | | refund amount | accounting | no | yes | Captured | Stripe | positive; not above refundable amount | Today |
| refund | refunded_at | timestamptz | | | created | accounting | no | yes | Captured | Stripe | valid UTC | Today |
| dispute | dispute_id | UUID | | | dispute ID | accounting | no | yes | Captured | Stripe | unique; parent payment exists | Today |
| dispute | amount_minor | bigint | | | amount | accounting | no | yes | Captured | Stripe | positive, currency consistent | Today |
| dispute | status | enum | | | dispute status | accounting | no | yes | Captured | Stripe | approved processor states | Today |
| processor_fee | processor_fee_id | UUID | | | balance transaction fee ID | accounting | no | yes | Captured | Stripe | unique processor ID | Today |
| processor_fee | payment_id | UUID | | | charge/payment relation | accounting | no | yes | Captured | Stripe | parent payment exists | Resolver |
| processor_fee | amount_minor | bigint | | | fee amount | accounting | no | yes | Captured | Stripe | nonnegative, currency consistent | Today |
| processor_fee | assessed_at | timestamptz | | | balance transaction created | accounting | no | yes | Captured | Stripe | valid UTC | Today |
| payment_allocation | allocation_id | UUID | | | metadata candidate | accounting | no | yes | Calculated | reconciliation system | immutable allocation event | Manual/derived |
| payment_allocation | payment_id | UUID | | | processor ID | accounting | no | yes | Captured | Stripe/canonical payment | payment exists | Resolver |
| payment_allocation | invoice_id | UUID | invoice relation | invoice ID | metadata/candidate | accounting | no | yes | Partially Captured | reconciliation hierarchy | invoice exists, same tenant/currency | Match/review |
| payment_allocation | allocated_amount_minor | bigint | paid amount | | payment amount | accounting | no | yes | Calculated | approved reconciliation | positive; cannot exceed payment availability or invoice balance | Derived/manual |
| payment_allocation | match_method | enum | | | IDs/metadata/customer | | yes | yes | Calculated | reconciliation engine | approved hierarchy value | Derived |
| payment_allocation | match_confidence | numeric(5,4) | | | candidate evidence | | yes | yes | Calculated | rule version | 0–1; auto only above approved threshold | Derived |
| reconciliation_issue | reconciliation_issue_id | UUID | | | import/match evidence | accounting | no | yes | Calculated | reconciliation system | immutable | Future implementation |
| reconciliation_issue | issue_type | enum | | | mismatch type | accounting | yes | yes | Calculated | reconciliation rules | approved issue vocabulary | Derived |
| reconciliation_issue | status | enum | | | | accounting | no | yes | Calculated | reconciliation workflow | `open, in_review, resolved, accepted_exception` | Future |
| reconciliation_issue | severity | enum | | | | | yes | yes | Calculated | rule version | `info, warning, error, critical` | Derived |
| reconciliation_issue | candidate_json | jsonb | invoice candidates | | metadata/candidates | accounting | yes | no | Calculated | matcher | tenant-safe, bounded, reproducible | Derived |
| reconciliation_issue | resolved_by_user_account_id | UUID | | | | reconciliation UI | no | no | Future | reconciliation workflow | authorized reviewer | Future |
| reconciliation_issue | resolution_reason | text | | | | reconciliation UI | no | no | Future | human reviewer | required when resolved | Future |

## Imports and immutable provenance

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| import_job | import_job_id | UUID | export identity | artifact | report identity | integration platform | no | yes | Calculated | import registry | immutable | Today |
| import_job | source_system | enum | Monday | archive type | Stripe | approved integrations | no | yes | Captured | import declaration | approved source key | Today |
| import_job | import_version | text | | | | | no | yes | Calculated | importer release | semantic/immutable version | Future implementation |
| import_job | transformation_version | text | | mapping version | | | no | yes | Calculated | mapping registry | immutable and resolvable | Future implementation |
| import_job | source_filename | text | export name | filename | report filename | integration artifact | no | yes | Captured | artifact registry | sanitized display name | Today |
| import_job | source_artifact_hash | char(64) | export bytes | artifact hash | report bytes | | yes | yes | Calculated | ingestion | valid SHA-256; unique in scope | Today |
| import_job | source_archive_quarter | quarter | board/archive | folder/filename | report period | | no | no | Captured | archive manifest | valid calendar quarter | Today |
| import_job | imported_at | timestamptz | | ingest clock | | | yes | yes | Calculated | platform clock | UTC; immutable | Today |
| import_job | status | enum | | | | | no | yes | Calculated | import orchestrator | approved state machine | Future implementation |
| source_record | source_record_id | UUID | item ID | row locator | report row/transaction ID | integration event ID | no | yes | Captured | source + registry | unique `(job, locator)` | Today |
| source_record | source_row_json | jsonb/pointer | item payload | raw row | raw transaction row | event payload | no | yes | Captured | immutable artifact | hash matches; protected | Today |
| source_record | source_updated_at | timestamptz | item update | row timestamp | processor timestamp | integration timestamp | no | no | Partially Captured | source system | valid timestamp | Today |
| provenance_link | canonical_entity | text | | | | | yes | yes | Calculated | promotion process | approved entity name | Future implementation |
| provenance_link | canonical_field | text | source column | archive column | Stripe field | future path | yes | yes | Calculated | mapping version | field exists in dictionary | Future implementation |
| provenance_link | source_field_path | text | column ID | column header | JSON/report path | API path | no | yes | Captured | source mapping | nonblank | Today |

## Intelligence and knowledge

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| knowledge_item | knowledge_item_id | UUID | | | | editorial service | no | yes | Future | editorial service | immutable | Future |
| knowledge_item | category | enum | notes/categories | | | editorial service/APIs | no | yes | Partially Captured | reviewed content | approved taxonomy | Manual/Future |
| knowledge_item | title | text | note title | | | editorial service | no | yes | Partially Captured | reviewed content | nonblank, length limit | Manual/Future |
| knowledge_item | body | structured text | notes | note text | | editorial service | no | yes | Partially Captured | reviewed content | sanitized; evidence linked | Manual/Future |
| knowledge_item | confidence | enum | | | | editorial service | no | yes | Future | author/reviewer | approved confidence vocabulary | Future |
| knowledge_item | review_status | enum | | | | editorial service | no | yes | Future | editorial workflow | `draft, in_review, approved` | Future |
| knowledge_item | publication_status | enum | | | | editorial service | no | yes | Future | Content Publisher | `unpublished, published, retired` | Future |
| knowledge_item | published_at | timestamptz | | | | editorial service | no | no | Future | editorial service | requires published state | Future |
| staff_observation | observation_id | UUID | notes/update | note row | | editorial service | no | yes | Partially Captured | human author + review | immutable authored revision | Manual/Transform |
| staff_observation | author_user_account_id | UUID | person | author | | identity service | no | yes | Partially Captured | identity service | author exists | Resolver |
| staff_observation | observed_at | timestamptz | update timestamp | timestamp | | editorial service | no | yes | Partially Captured | source/human | valid UTC | Transform |
| staff_observation | statement | text | update/note | note | | editorial service | no | yes | Partially Captured | reviewed human content | label as observation; evidence links | Manual review |
| staff_observation | scope_json | jsonb | linked item/client | source scope | | editorial service | no | yes | Partially Captured | reviewed content | tenant-safe targets | Transform |

## Weather and knowledge support entities

| Canonical Entity | Canonical Field | Data Type | Monday Source | Archive Field | Stripe Source | Future Source | Derived | Required | Availability | Source Authority | Validation Rule | Notes / Readiness |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|
| weather_event | weather_event_id | UUID | | | | Weather API | no | yes | Future | approved provider/canonical registry | immutable, provider ID unique | Future |
| weather_event | provider_event_id | text | | | | Weather API | no | yes | Future | approved provider | unique per provider | Future |
| weather_event | event_type | enum | | | | Weather API | no | yes | Future | approved provider | governed weather vocabulary | Future |
| weather_event | started_at | timestamptz | | | | Weather API | no | yes | Future | approved provider | valid UTC | Future |
| weather_event | ended_at | timestamptz | | | | Weather API | no | no | Future | approved provider | not before start | Future |
| weather_event | geography_json | jsonb/geography | | | | Weather API | no | yes | Future | approved provider | valid geometry/jurisdiction | Future |
| weather_event | severity | text/enum | | | | Weather API | no | no | Future | approved provider | provider scale and version retained | Future |
| file_weather_match | file_weather_match_id | UUID | | | | matcher | no | yes | Future | matching service | immutable per version | Future |
| file_weather_match | file_id | UUID | file/location/date | file | | O | no | yes | Partially Captured | canonical claim | file exists | Future derivation |
| file_weather_match | weather_event_id | UUID | | | | Weather API | no | yes | Future | canonical weather event | event exists | Future |
| file_weather_match | match_version | text | | | | matcher | yes | yes | Future | matching service | resolvable version | Future |
| file_weather_match | match_confidence | numeric(5,4) | | | | matcher | yes | yes | Future | matching service | 0–1; evidence present | Future |
| file_weather_match | evidence_json | jsonb | county/ZIP/loss date | source geography | | matcher | yes | yes | Future | matching service | no causation claim | Future |
| knowledge_revision | knowledge_revision_id | UUID | note history | note revision | | editorial service | no | yes | Future | editorial service | immutable | Future |
| knowledge_revision | knowledge_item_id | UUID | | | | editorial service | no | yes | Future | editorial service | parent exists | Future |
| knowledge_revision | revision_number | integer | | | | editorial service | yes | yes | Future | editorial service | positive, unique per item | Future |
| knowledge_revision | body | structured text | note body | note | | editorial service | no | yes | Future | reviewed content | sanitized | Future |
| knowledge_evidence | knowledge_evidence_id | UUID | update/file links | source references | | editorial service | no | yes | Future | editorial service | immutable | Future |
| knowledge_evidence | knowledge_item_id | UUID | | | | editorial service | no | yes | Future | editorial service | parent exists | Future |
| knowledge_evidence | evidence_type | enum | note/file/metric | source kind | | editorial service | no | yes | Future | editorial taxonomy | `source_fact, metric, external_reference, observation` | Future |
| knowledge_evidence | evidence_reference | text/JSON | linked source | locator | | editorial service | no | yes | Future | evidence registry | tenant-safe and resolvable | Future |

## Future integration reservations

| Future source | Reserved mapping locations | Authority expectation |
|---|---|---|
| Weather APIs | `weather_event.*`, geography, event timing, file-weather evidence | Approved provider owns weather facts; matches remain derived |
| Xactimate | estimate versions, pricing lists, line items, RCV/ACV/depreciation evidence | Xactimate owns imported estimate facts; canonical financial policy resolves conflicts |
| Carrier APIs | carrier claim ID, adjuster, status evidence, RCV/settlement fields | Carrier owns its transmitted facts; O owns canonical resolved state |
| Builder integrations | property, contract, homeowner reference, job milestones | Builder source owns submitted job facts |
| CRM | organizations, branches, client contacts, sales assignments, goals | CRM owns client master data when approved |
| Accounting | invoices, charges, adjustments, ledger classification | Accounting owns invoice facts; Stripe owns processor cash facts |
| HomeHub | reserved organization, branch, user, and file-reference adapter only | No authority until a separate integration decision is approved |

No future source is implemented by this document.

## Conflict-resolution authority

| Field family | Winning authority | Conflict action |
|---|---|---|
| Canonical status | O; Monday before O exists | retain both source facts, open issue when transition cannot reconcile |
| Processor payment/refund/dispute/fee | Stripe | never overwrite processor fact with Monday/accounting summary |
| Invoice and charge lines | O/accounting | compare Monday and Stripe metadata; issue mismatch |
| Organization/branch master | O; future CRM if approved | resolve aliases; do not “latest wins” |
| Carrier identity | canonical carrier alias table | unresolved alias enters review queue |
| User email/account status | future identity provider | Monday is seed evidence only |
| Financial claim facts | O with field-level provenance | retain competing source values and reviewed override |
| Knowledge/observations | human-reviewed content | publication requires governed review |
| Weather event facts | approved weather provider | local match is derived, never a provider fact |

## Mandatory transformations

1. Trim surrounding whitespace; preserve meaningful internal spacing.
2. Convert blank strings to NULL, except explicit enum fallbacks such as property type `unknown`.
3. Never convert NULL, invalid, or not-captured financial data to zero.
4. Normalize Unicode, email casing, state abbreviations, ZIP formatting, and UTC timestamps.
5. Parse currency into integer minor units with explicit currency.
6. Resolve organization, branch, carrier, and status aliases through versioned tables.
7. Collapse exact duplicate status events while retaining duplicate-source provenance.
8. Preserve source archive quarter separately from all date-derived quarters.
9. Separate raw facts, derived values, and human observations.
10. Record parser and transformation versions for every promoted field.

## Validation rationale catalog

| Validation | Business purpose |
|---|---|
| Completed date is not before submitted date | Prevents negative cycle time and preserves credible throughput cohorts. |
| Rejected/withdrawn dates require matching status transitions | Prevents a date column from contradicting lifecycle history. |
| Status is valid for service type | Keeps estimate-only and claim-handling workflows analytically distinct. |
| One current assignment per file/type | Makes ownership unambiguous while retaining reassignment history. |
| Branch belongs to file organization and tenant | Prevents cross-client leakage and incorrect branch performance. |
| Additional RCV equals final minus initial RCV | Prevents competing spreadsheet formulas and makes recovery reproducible. |
| Null financials retain explicit availability | Prevents missing outcomes from being misreported as zero. |
| Invoice total equals active charge lines | Ensures billed revenue can be audited to its components. |
| Payment date does not precede invoice creation under normal matching | Detects false matches and temporal inconsistencies; exceptions require review. |
| Allocation does not exceed payment availability | Prevents the same cash from being counted more than once. |
| Allocation does not exceed invoice balance without approved overpayment handling | Prevents negative receivables and false collection performance. |
| Processor IDs and artifact hashes are unique | Makes imports idempotent and protects against duplicate cash or file counts. |
| Source and canonical tenant IDs agree | Enforces the primary data-isolation boundary. |
| ZIP remains text and state uses USPS codes | Preserves leading zeros and enables reliable geographic joins. |
| All derived values record calculation version | Allows historical dashboards to be reproduced after formulas evolve. |

## Field-to-KPI dependency index

| Canonical fields | Dependent KPIs / outputs |
|---|---|
| `file_id`, `submitted_at`, `submission_quarter` | total submitted files, intake trend, geographic expansion |
| `service_type` | estimate-only files, claim-handling files, lifecycle segmentation |
| `current_status`, `status_group`, status history | active inventory, closed files, stalled files, throughput |
| status `entered_at/exited_at/duration` | stage aging, cycle decomposition, queue performance |
| assignment type, assignee, effective range | estimator/handler throughput, sales attribution, current workload |
| organization and branch IDs | client/branch mix, branch performance, tenant reporting |
| carrier and adjuster IDs | carrier mix, cycle time by carrier, adjuster analysis |
| loss state/county/ZIP/date | geographic expansion, weather opportunity, regional performance |
| initial/final/additional RCV and availability | additional RCV totals/average/median, financial coverage |
| completion date/quarter | closed production, operational production, completion-to-cash cohort |
| invoice date/quarter, charges, invoice amount | invoiced revenue, fee revenue, charge mix |
| due date/quarter, outstanding balance | receivables aging, overdue balance |
| payment/available date, gross, fee, net | cash received, net collections, collection quarter |
| allocations and refunds/disputes | amount collected, invoice balance, completion-to-cash |
| update timestamps | update frequency, days since last update, stalled-file observation |
| weather event and match evidence | weather opportunity, carrier/geographic quarterly analysis |
| knowledge evidence/review/publication | executive briefing provenance, published intelligence |

## Import-readiness rollup

| Readiness | Field families |
|---|---|
| Can import today | Monday file IDs, names, service/property/status, core dates, geography, source quarter, selected financials; Stripe payment/refund/dispute/fee facts and metadata; artifact/row provenance |
| Needs transformation | canonical IDs, organization/branch/carrier aliases, users, statuses, timestamps, ZIP/state, money minor units, status/assignment intervals, invoice charge lines |
| Requires manual entry/review | unresolved identities, source conflicts, heuristic payment allocations, observation confidence, reconciliation resolutions |
| Future integration | production identity/roles, carrier/adjuster API enrichment, weather, Xactimate, CRM, accounting master, knowledge publishing |
| Unavailable | fields with no approved source or unresolved authority policy; these remain NULL with documented status |

## Derived-field catalog

| Field | Calculation | Dependencies | Failure conditions | Minimum coverage |
|---|---|---|---|---:|
| status_group | lifecycle map of current status | service type, status, definition version | unknown status | 100% for inventory |
| additional_rcv_minor | final RCV − initial carrier RCV | both valid amounts, currency | missing/invalid operands, currency mismatch | disclose; unavailable per file |
| duration_seconds | exited − entered | ordered status timestamps | missing exit, reversed dates | disclose |
| cycle_time_days | completion − submission | valid dates and completion | missing/invalid dates | 80% for executive KPI |
| submission/completion/invoice/due/collection quarter | calendar quarter of respective date | qualifying date, timezone policy | missing date/timezone unresolved | disclose |
| outstanding_balance_minor | invoice amount − net qualifying allocations − adjustments | balanced invoice and allocations | over-allocation, currency mismatch | 95% |
| collection_lag_days | payment date − invoice date | reconciled allocation | unmatched payment, invalid dates | 80% |
| completion_to_cash_lag_days | payment date − completion date | completion plus allocation | unmatched invoice/payment | 80% |
| operational_production | qualifying completed files/charges by completion date | lifecycle, completion, charge policy | invalid completion | 90% |
| invoiced_revenue | active invoice amount by invoice date | balanced invoices | unbalanced/void invoice | 95% |
| collected_revenue | settled allocations by payment date | reconciled payments | unmatched/ambiguous allocation | 95% |
| net_collections | collected less policy-defined refunds/disputes/fees | processor facts, definition version | incomplete processor report | 95% |

## Executive KPI dependency and trust requirements

| KPI | Purpose | Required fields | Calculation | Coverage / confidence | Failure condition | Example |
|---|---|---|---|---|---|---|
| Total submitted files | workload intake | file ID, submitted date | distinct files in cohort | 100%, A/B | duplicate IDs or invalid dates | 120 files |
| Active inventory | open workload | file ID, current status, service type | nonterminal files | 100%, A/B | unmapped status | 38 active |
| Average cycle time | throughput | submitted and completed dates | mean days for eligible completions | ≥80%, A/B | coverage below threshold → unavailable | 24.6 days |
| Median cycle time | robust throughput | same | median elapsed days | ≥80%, A/B | same | 21 days |
| Additional RCV | financial outcome | initial/final RCV, status, currency | sum final−initial | coverage shown; A/B for executive use | invalid operands/currency | $425k |
| Average additional RCV | typical outcome | same | sum / eligible files | ≥80% applicable coverage, A/B | insufficient eligible files | $8.5k |
| Financial coverage | trust visibility | availability status | usable/applicable | 100% status coverage, A | missing status | 86% |
| Carrier mix | concentration | carrier ID, file ID | carrier files / selected files | ≥95%, A/B | unresolved carriers material | 31% |
| Operational production | completed work | completion, status, charge policy | versioned completion cohort | ≥90%, A/B | invalid lifecycle | Q1 production |
| Collected revenue | cash | payment, allocation, payment date | settled allocations | ≥95%, A/B | unreconciled cash material | Q2 cash |
| Completion-to-cash | cash conversion | completion, invoice, allocation, payment | lag/cohort bridge | ≥80%, A/B | chain incomplete | 34 days |

## Data trust envelope

Every important field and KPI must expose:

- `measurement_status`: `measured, derived, estimated, unavailable`;
- `confidence_grade`: `A, B, C, D, Limited`;
- `coverage_percentage`;
- `source_count`;
- `calculation_version` for derived values;
- `validation_status`: `valid, warning, invalid, not_evaluated`;
- exclusion counts and reasons;
- evaluation timestamp and drill-down lineage.

“Can this value be trusted?” is answered by the full envelope, never by confidence grade alone.
