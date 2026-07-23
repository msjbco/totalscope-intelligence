# Canonical Data Model

## Boundaries

`tenant` is the security and ownership boundary. TotalScope platform administration may span tenants only through audited platform permissions. A client tenant owns its organizations, branches, users, files, assignments, invoices, imports, and observations. Shared reference data such as carriers, code releases, and product catalogs is platform-owned and explicitly non-tenant.

## Core entities

| Entity | Primary key | Required foreign keys | Uniqueness and critical indexes |
|---|---|---|---|
| `tenant` | `tenant_id` | — | unique `slug`; index `status` |
| `organization` | `organization_id` | `tenant_id`; optional `parent_organization_id` | unique `(tenant_id, external_key)` when present; indexes `(tenant_id, organization_type)`, `parent_organization_id` |
| `branch` | `branch_id` | `tenant_id`, `organization_id` | unique `(organization_id, branch_code)`; index `(tenant_id, organization_id)` |
| `user_account` | `user_account_id` | `tenant_id`; optional `branch_id` | unique normalized `email`; indexes `(tenant_id, branch_id)`, `(tenant_id, status)` |
| `platform_role_grant` | `role_grant_id` | `tenant_id`, `user_account_id` | unique active `(user_account_id, platform_role)` |
| `business_function_grant` | `function_grant_id` | `tenant_id`, `user_account_id` | unique active `(user_account_id, business_function)` |
| `claim_file` | `file_id` | `tenant_id`, `client_organization_id`, `branch_id` | unique `(tenant_id, file_number)`; indexes status, service type, opened date, completion date, carrier, contractor |
| `file_status_history` | `status_history_id` | `tenant_id`, `file_id` | index `(file_id, effective_at desc)`; one open history row per file |
| `file_assignment` | `assignment_id` | `tenant_id`, `file_id`, `assignee_user_account_id` | partial unique `(file_id, assignment_type)` where `ended_at is null`; indexes assignee and effective range |
| `carrier` | `carrier_id` | — | unique normalized name; optional unique NAIC code |
| `adjuster` | `adjuster_id` | optional `carrier_id` | index `(carrier_id, normalized_email)`; no cross-carrier identity assumption |
| `file_adjuster_history` | `file_adjuster_history_id` | `tenant_id`, `file_id`, `adjuster_id` | one current adjuster per file; index effective range |
| `file_financial` | `file_financial_id` | `tenant_id`, `file_id` | unique `file_id`; index `financial_availability_status` |
| `invoice` | `invoice_id` | `tenant_id`, `file_id`, `client_organization_id` | unique `(tenant_id, invoice_number)`; indexes invoice/due dates and status |
| `invoice_charge` | `invoice_charge_id` | `tenant_id`, `invoice_id` | index `(invoice_id, charge_type)` |
| `payment` | `payment_id` | `tenant_id`, `stripe_import_job_id` | unique `(tenant_id, processor, processor_payment_id)` |
| `payment_allocation` | `payment_allocation_id` | `tenant_id`, `payment_id`, `invoice_id` | unique `(payment_id, invoice_id, allocation_sequence)` |
| `refund` / `dispute` / `processor_fee` | entity-specific ID | `tenant_id`, `payment_id` | unique processor IDs; payment/date indexes |
| `archive_import_job` | `import_job_id` | `tenant_id` | unique `(tenant_id, source_system, source_artifact_hash)` |
| `source_record` | `source_record_id` | `tenant_id`, `import_job_id` | unique `(import_job_id, source_locator)` |
| `reconciliation_issue` | `reconciliation_issue_id` | `tenant_id`, optional payment/invoice | indexes status, severity, owner |
| `weather_event` | `weather_event_id` | optional provider import | indexes event date, type, geography |
| `file_weather_match` | `file_weather_match_id` | `tenant_id`, `file_id`, `weather_event_id` | unique `(file_id, weather_event_id, match_version)` |

## Claim file fields

Required:

- `file_id`, `tenant_id`, `file_number`
- `service_type`: `estimate_only | claim_handling`
- `property_type`: `residential | commercial | unknown`
- `current_status`
- `client_organization_id`, `branch_id`
- `submitted_at`, `submission_quarter`
- `source_archive_quarter`
- immutable provenance and audit timestamps

Optional associations:

- client sales rep and manager through assignments;
- TotalScope estimator and claim handler through assignments;
- carrier and adjuster history;
- homeowner display name as reference-only text;
- property address with separately protected access.

## Organization rules

`organization_type` supports `client`, `brand`, `law_firm`, `carrier`, `contractor`, and `other`. A parent is optional. Branches belong to one organization. A client user account belongs to at most one branch. Email uniqueness is account-level: the same physical person using different emails creates separate accounts until an explicit future identity-linking design is approved.

## Source facts, derivatives, and observations

- **Source facts:** imported or manually captured values with provenance, such as file status, invoice amount, or payment date.
- **Derived metrics:** reproducible calculations with definition version, inputs, coverage, and evaluation time.
- **Human observations:** authored assertions with author, scope, effective period, evidence links, review status, and publication state.

Derived metrics never overwrite source facts. Human observations never masquerade as measured data.

## Immutable provenance fields

Imported canonical records retain `source_system`, `source_record_id`, `source_field_path`, `import_job_id`, `source_payload_hash`, `source_artifact_name`, `source_observed_at`, and `ingested_at`. Corrections append superseding records or audited overrides; original source values remain queryable.
