# Roles and Permissions Model

## Separation of concerns

Platform permissions answer **what the account may do in the application**. Business functions answer **what the person does operationally**. Neither implies the other.

## Client platform roles

| Role | Intended authority |
|---|---|
| Super Admin | Tenant configuration, admins, branches, all tenant data, exports |
| Admin | Operational configuration and users within delegated scope |
| Oversight | Read-only cross-branch analytics and file visibility |
| None | No client administrative capabilities |

## Client business functions

`Sales Manager`, `Sales Rep`, `Claim Handler`, and `Billing Manager` may be granted independently and may coexist. Functions drive assignment choices and workflow views, not broad authorization.

## TotalScope roles

| Role | Core capability |
|---|---|
| Admin | TotalScope tenant configuration and audited elevated access |
| Manager | Work allocation, operational oversight, performance views |
| Estimator | Assigned estimating work and file updates |
| Claim Handler | Assigned claim-handling work and negotiation updates |
| Analyst | Governed analytical access and metric review |
| Content Editor | Draft human-intelligence content |
| Content Publisher | Approve and publish governed content |

## Enforcement order

1. Authenticate account.
2. Resolve active tenant membership.
3. Enforce tenant boundary.
4. Evaluate platform role and scoped grants.
5. Evaluate branch/file access.
6. Use business function for workflow eligibility.
7. Record audited decisions for exports, financial access, impersonation, and publication.

## Scope and constraints

- One account has one normalized email and one tenant.
- A client account references at most one branch.
- Different emails are different accounts, even for the same physical person.
- No role grants cross-tenant visibility.
- TotalScope cross-tenant support access requires explicit, expiring, reason-coded grants.
- `None` does not erase business-function membership; it means no administrative platform role.
- Role changes are append-only grants with `granted_at`, `revoked_at`, grantor, and reason.

## Permission matrix baseline

| Action | Client Super Admin | Admin | Oversight | TotalScope Manager | Estimator / Claim Handler | Analyst |
|---|---:|---:|---:|---:|---:|---:|
| Manage client users | yes | scoped | no | no | no | no |
| View tenant analytics | yes | scoped | yes | delegated | assigned scope | governed |
| Modify assigned file | scoped | scoped | no | yes | assigned only | no |
| View financial details | yes | Billing Manager or grant | governed | delegated | minimum necessary | governed |
| Publish knowledge | no | no | no | no | no | only with Publisher role |
