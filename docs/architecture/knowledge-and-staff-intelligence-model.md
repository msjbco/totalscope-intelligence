# Knowledge and Staff Intelligence Model

This is reserved architecture only; no editorial UI or publishing workflow is implemented in Phase B.

## Content categories

- client quarterly profile snapshots;
- client business goals;
- organization events and process changes;
- TotalScope staff observations;
- carrier trends and recurring denials;
- Xactimate pricing updates;
- product and shingle releases;
- building-code updates;
- TotalScope recommendations;
- quarterly industry intelligence briefings.

## Entities

`knowledge_item` stores ID, tenant/platform scope, category, title, structured body, author, status, effective period, sensitivity, and timestamps. `knowledge_evidence` links source artifacts, canonical facts, external references, and quoted excerpts. `knowledge_scope` links organizations, branches, carriers, geographies, products, or file cohorts. `knowledge_revision` preserves immutable version history. `quarterly_profile_snapshot` captures point-in-time client goals, operating context, and approved metrics.

## Fact boundary

- Source facts must reference canonical or imported evidence.
- Derived statements identify metric definition and evaluation timestamp.
- Human observations identify author, observation date, confidence, and evidence.
- Recommendations are explicitly labeled and never presented as measured facts.

## Editorial governance

States: `draft → in_review → approved → published → retired`. Content Editor may draft and revise. Content Publisher may approve and publish. Self-approval policy is an open decision. All publication and retirement actions are audited.

## Tenant and sensitivity

Items are `platform`, `tenant`, or `organization` scoped. Tenant material cannot be reused across tenants without a governed anonymization and approval process. Sensitive observations may have narrower role grants and retention policies.

## Critical indexes

- `(tenant_id, category, effective_from)`
- `(tenant_id, publication_status, published_at)`
- scope target and category
- evidence source ID
- full-text search is deferred until content-volume and security requirements are approved
