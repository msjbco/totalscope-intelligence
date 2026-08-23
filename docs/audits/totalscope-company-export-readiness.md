# TotalScope company export audit and import-readiness checkpoint

This is an aggregate-only audit of the real operational export `all-companies (1).csv`. The source remains outside the repository and is not reproduced here. No hosted import has occurred.

## Governing decision

- Company identity: source `entity_id` maps deterministically to one canonical `clients` row.
- Location identity: `(entity_id, address_id)` maps to one canonical `branches` row. `address_id` is not globally unique and must never be used alone.
- Person identity: `user_id` maps to `operational_people`; the company relationship is separately preserved as `(entity_id, user_id)`.
- Names, addresses, phones, and emails are review signals only. No fuzzy merge is performed.
- Absence from a later full export does not delete or deactivate a canonical record.
- TotalScope supplied the authoritative business mapping on August 21, 2026: A is active/current; I is inactive but may be reactivated; D is deleted and requires re-registration. The original code remains preserved independently from canonical lifecycle.

## Source profile

| Measure | Result |
|---|---:|
| SHA-256 | `27eabd92fb8141d446e29d6d05b44d2d5284936b87f6a261620a7c0c01b1c9cf` |
| Bytes / columns / rows | 215,957 / 16 / 864 |
| Unique `entity_id` | 805 |
| Missing `entity_id` | 0 |
| Duplicate `entity_id` values / covered rows | 49 / 108 |
| Unique raw `address_id` | 773 |
| Unique `(entity_id,address_id)` | 864 |
| Reused `address_id` across companies | 62 values / 153 rows |
| Companies with multiple addresses | 49 |
| Unique `user_id` / missing user rows | 672 / 113 |
| Unique company-user relationships | 693 |
| Companies with multiple contacts in this export | 0 |

Duplicate raw company names cover 104 values and 250 rows; normalized names cover 107 values and 273 rows. Duplicate emails cover 108 values/267 rows, email domains 98/492, and phones 113/304. These counts are expected to include repeated rows for legitimate locations and shared administrative contacts; they are not merge instructions.

## Quality and review queues

- Missing company names: 1. Missing street number/name, city, state, ZIP, company email, or company phone: 0.
- Missing contact first name, last name, role, and source-created timestamp: 113 each, aligned with rows having no user.
- Malformed values: ZIP 0, state 1, email 1, phone 0. Non-U.S. status cannot be determined because the export has no country field.
- Exact duplicate rows: 0. Normalized exact duplicate rows: 0.
- Cross-entity deterministic review signals: normalized name 66 values/173 entities; email 70/170; phone 75/207; exact address 62/154.
- 210 entity pairs share at least two deterministic signals, 158 share at least three, and 111 share normalized name plus exact address. They remain distinct canonical clients pending human review.
- No entity has conflicting names, statuses, emails, or phones within the export.

## Status inventory

| Code | Source rows | Source entities | Accepted canonical clients | Current mapping |
|---|---:|---:|---:|---|
| A | 709 | 651 | 651 | current |
| D | 82 | 81 | 80 | inactive; deleted source identity retained |
| I | 73 | 73 | 73 | inactive; reactivation-capable source identity retained |

The single quarantined missing-name row has source status D, so the accepted canonical population contains 80 D clients even though the source contains 81 distinct D entity IDs. The mapping is a governed importer contract and cannot be overridden with a conflicting environment value. Only A is current for product and Weather behavior. I and D remain non-current while their distinct source codes are retained for history and future prospect reconciliation.

## Proposed deterministic reconciliation

Of 864 source rows, 863 are structurally acceptable and one row lacking a company name is quarantined with its protected raw provenance. Expected canonical output is 804 clients, 863 locations, 671 people, and 692 company-contact relationships. A repeated identical fingerprint reuses the completed ingestion run; stable IDs and database uniqueness prevent duplicate canonical records.

Every row is recorded in the service-role-only ingestion ledger with artifact checksum, source locator, raw payload, parsing outcome, normalization attempt, issue records, and field-level canonical lineage. Reconciliation reports created, updated, and unchanged counts. Malformed optional values are never fabricated or zero-filled.

## Schema and security boundary

The additive client-master migration extends the existing C3 client and branch model, adds composite source identities and contact relationships, and enforces `(branch_id, client_id)` ownership in PostgreSQL. Real master rows are marked restricted. Only `staging_admin` may read them through authenticated browser sessions; contact relationships and ingestion records remain service-role-only.

Weather uses an admin-only, contact-free location RPC. It returns only governed current, active, successfully geocoded locations. Direct/near/outside conclusions require rooftop, parcel, or interpolated-address precision; street, ZIP, city, unknown, missing coordinates, or missing event geometry produce an explicit unknown result.

## Geocoding dependency and hosted blockers

The provider-neutral geocoding contract is implemented with an explicit `not_configured` provider. No coordinates or city centroids are fabricated. A commercially approved provider and credentials are still required before exposure can be calculated.

Hosted import must not proceed until:

1. The single missing-name record and deterministic near-duplicate queues retain their governed quarantine/review disposition.
2. A geocoding provider is separately selected and authorized if Weather exposure activation is desired.
3. The additive migration and controlled two-pass staging import receive a separate approval gate.

Potential-contractor provider selection, purchasing, scraping, and discovery were not performed.
