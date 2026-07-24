# C2 staging deployment runbook

This runbook creates a separate staging environment. It must not be described or used as production.

## Michael: Supabase manual actions

1. Create a new hosted Supabase project dedicated to TotalScope staging.
2. In Authentication settings, keep email/password enabled and disable public user signups.
3. Record the project URL, anon key, service-role key, direct database password, and project reference in the approved secret manager. Do not put them in Git.
4. Link the CLI and apply migrations:

   ```powershell
   npx --yes supabase@latest login
   npx --yes supabase@latest link --project-ref <STAGING_PROJECT_REF>
   npx --yes supabase@latest db push --linked
   ```

5. Create or invite staging users from the Supabase Auth administration UI. Confirm each receives an active `viewer` profile.
6. Promote only the designated staging administrator with the controlled SQL in the C2 architecture document.
7. Confirm anon access cannot select raw/staging tables and a viewer cannot open import validation.

## Import operations

Local reset and import:

```powershell
npx --yes supabase@latest db reset --local
$env:TOTALSCOPE_IMPORT_TARGET="local"
npm run import:q2-2026 -- --confirm-target local
npm run validate:q2-2026-import
```

Hosted staging import:

```powershell
$env:SUPABASE_URL="<STAGING_PROJECT_URL>"
$env:SUPABASE_SERVICE_ROLE_KEY="<STAGING_SERVICE_ROLE_KEY>"
$env:TOTALSCOPE_IMPORT_TARGET="staging"
npm run import:q2-2026 -- --confirm-target staging
npm run validate:q2-2026-import
npm run import:q2-2026 -- --confirm-target staging
npm run validate:q2-2026-import
```

Read the printed target summary before the first batch. The importer is explicit and must never run during deployment. Preserve the ignored workbook at `data/source/Archive_Q2_2026_1784837413.xlsx`.

## Michael: Vercel manual actions

1. Import the GitHub repository into a new Vercel staging project.
2. Configure the staging branch only.
3. Add:
   - `TOTALSCOPE_DATA_MODE=live`
   - `TOTALSCOPE_DEPLOYMENT_ENV=staging`
   - `NEXT_PUBLIC_SUPABASE_URL=<STAGING_PROJECT_URL>`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>`
4. Do not add `SUPABASE_SERVICE_ROLE_KEY`, database passwords, source files, or importer target variables to Vercel.
5. Deploy and verify `/api/health` returns HTTP 200 with three coarse statuses.

## Staging acceptance checklist

- [ ] Signed-out direct access to `/dashboard`, `/claims`, claim detail, and `/admin/imports/q2-2026` redirects to `/login`.
- [ ] Invalid credentials show a generic error.
- [ ] An admin-created viewer can sign in.
- [ ] Dashboard loads Q2 data without demo fallback.
- [ ] Claims Explorer and claim detail load approved fields and sanitized provenance.
- [ ] Viewer cannot access import validation.
- [ ] Staging admin can access import validation and expected counts pass.
- [ ] Raw source, aliases, people, staging tables, and mutation RPCs are denied through the anon/authenticated API.
- [ ] Refresh preserves the session.
- [ ] Sign out clears access and direct URLs redirect again.
- [ ] `/api/health` is coarse and contains no secrets or source details.
- [ ] First import and idempotency rerun preserve the validated C1 counts.
- [ ] `npm test`, typecheck, lint, build, and `git diff --check` pass.

## Known staging gaps

Enterprise SSO, password recovery customization, MFA enforcement, production observability, audit-event export, billing, live weather, and production disaster recovery are not implemented. Domain pages other than the C1 dashboard and claims vertical slice continue to show explicitly labeled synthetic demonstration analytics.
