# C2 staging security architecture

C2 adds deployable staging controls without changing the validated C1 schema or import contract. It is not a production launch.

## Trust boundaries

- Browser code receives only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Supabase Auth owns email/password credentials and cookie-backed sessions.
- Server Components verify the user with Supabase Auth before live reads.
- Live repositories forward the authenticated JWT and anon key. They never use the service role and never fall back to demo data.
- The Q2 importer is the only application utility that uses `SUPABASE_SERVICE_ROLE_KEY`.
- Demo mode is explicit, local, synthetic, and does not query Supabase.

## Roles and access

`application_profiles` is one-to-one with `auth.users`. New users receive `viewer`; there is no public signup or browser role mutation.

| Capability | viewer | staging_admin |
|---|---:|---:|
| Dashboard, claims, claim detail | Yes | Yes |
| Approved financial and derived fields | Yes | Yes |
| Matched operational updates | Yes | Yes |
| Sanitized source coordinates | Yes | Yes |
| Import validation and quality queue | No | Yes |
| Raw source rows, aliases, people, staging rows | No | No |
| Import mutation RPCs | No | No |

The additive C2 migration first revokes browser table access, then grants approved columns only. RLS requires an active application profile. Admin policies additionally require `staging_admin`. C1 mutation functions remain service-role-only.

Role changes are a controlled database administration operation:

```sql
update public.application_profiles
set role = 'staging_admin'::public.application_role, updated_at = now()
where user_id = '<auth-user-uuid>';
```

Do not expose this statement through browser code or user-editable metadata.

## Request flow

Middleware refreshes the cookie session and provides the initial signed-out redirect. Each protected route also has a server layout guard, so bypassing middleware does not bypass authorization. The admin tree independently checks the database-backed role.

The health endpoint returns only `app`, `configuration`, and `database` states. It exposes no project URL, reference, table name, count, user, key, source metadata, or exception.

## Forward-only migration and rollback

Apply C1 and then C2 to a new staging project. Supabase migrations are forward-oriented; do not edit or replay C1 manually. For staging rollback:

1. Stop the Vercel staging deployment or point it to the prior build.
2. Disable affected staging users in Supabase Auth.
3. Prefer restoring/recreating the disposable staging project from the last validated migration/import procedure.
4. If an in-place reversal is unavoidable, create and review a new compensating migration; never delete migration history.

The source workbook, environment files, passwords, JWTs, and service-role keys remain untracked.
