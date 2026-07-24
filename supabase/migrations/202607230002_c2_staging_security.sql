-- TotalScope Intelligence C2: authenticated staging access.
-- Additive only: the validated C1 migration and import behavior remain unchanged.

create type public.application_role as enum ('viewer', 'staging_admin');

create table public.application_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.application_role not null default 'viewer'::public.application_role,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.application_profiles enable row level security;
alter table public.application_profiles force row level security;

create or replace function public.create_application_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.application_profiles (user_id, role, display_name)
  values (new.id, 'viewer'::public.application_role, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger create_application_profile_after_auth_user
after insert on auth.users
for each row execute function public.create_application_profile();

insert into public.application_profiles (user_id, role, display_name)
select id, 'viewer'::public.application_role, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
from auth.users
on conflict (user_id) do nothing;

create policy "users read own active profile"
on public.application_profiles for select
to authenticated
using (auth.uid() = user_id and active);

grant select (user_id, role, display_name, active) on public.application_profiles to authenticated;
grant select, insert, update, delete on public.application_profiles to service_role;
revoke insert, update, delete, truncate, references, trigger on public.application_profiles from anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_active_application_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.application_profiles p
    where p.user_id = auth.uid() and p.active
  );
$$;

create or replace function private.is_staging_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.application_profiles p
    where p.user_id = auth.uid() and p.active and p.role = 'staging_admin'::public.application_role
  );
$$;

revoke all on function private.is_active_application_user() from public, anon;
revoke all on function private.is_staging_admin() from public, anon;
grant execute on function private.is_active_application_user() to authenticated;
grant execute on function private.is_staging_admin() to authenticated;

-- Explicitly keep every C1 table denied, then grant only approved columns below.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select (user_id, role, display_name, active) on public.application_profiles to authenticated;

create policy "active users read organizations"
on public.organizations for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read claims"
on public.claims for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read claim financial facts"
on public.claim_financial_facts for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read claim derived metrics"
on public.claim_derived_metrics for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read matched claim updates"
on public.claim_updates for select to authenticated
using ((select private.is_active_application_user()) and claim_id is not null and not unmatched_source);
create policy "active users read sanitized source row coordinates"
on public.source_rows for select to authenticated
using ((select private.is_active_application_user()));

grant select (id, organization_type, display_name) on public.organizations to authenticated;
grant select (
  id, source_system, monday_item_id, display_name, raw_status, normalized_status,
  lifecycle_state, contractor_id, carrier_id, source_created_date, assigned_date,
  closed_date, status_change_date, service_type, property_type, source_row_id
) on public.claims to authenticated;
grant select (
  claim_id, source_field_name, normalized_metric_name, parsed_numeric_value, currency,
  source_availability_status, source_worksheet, source_row, source_column_index,
  source_column_header, transformation_version, calculation_status, confidence
) on public.claim_financial_facts to authenticated;
grant select (
  claim_id, metric_name, metric_version, calculated_value, source_comparison_value,
  reconciliation_status, tolerance, difference, confidence
) on public.claim_derived_metrics to authenticated;
grant select (
  monday_post_id, claim_id, update_body, blank_body, duplicate_body, source_timestamp_raw,
  parsed_timestamp, timezone_status, author_name, source_worksheet, source_row
) on public.claim_updates to authenticated;
grant select (id, physical_row_number) on public.source_rows to authenticated;

-- Import validation is staging-admin only. The security-invoker view obeys the
-- underlying import_jobs/table policies instead of running with owner privileges.
alter view public.q2_2026_import_validation set (security_invoker = true);
create policy "staging admins read import jobs"
on public.import_jobs for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read quality issues"
on public.data_quality_issues for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins validate claims"
on public.staged_subitem_headers for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins validate subitems"
on public.staged_subitem_details for select to authenticated
using ((select private.is_staging_admin()));

grant select (
  id, source_period, source_filename, source_sha256, importer_version, started_at,
  completed_at, status, warning_count, error_count, source_workbook_metadata, metadata
) on public.import_jobs to authenticated;
grant select (issue_type, severity, status, claim_id, description) on public.data_quality_issues to authenticated;
grant select (id, import_job_id, raw_status) on public.claims to authenticated;
grant select (id, import_job_id) on public.claim_updates to authenticated;
grant select (id, import_job_id, reconciliation_status) on public.claim_derived_metrics to authenticated;
grant select (id, import_job_id) on public.staged_subitem_headers to authenticated;
grant select (id, import_job_id) on public.staged_subitem_details to authenticated;
grant select on public.q2_2026_import_validation to authenticated;

-- The C1 validator uses service_role against this security-invoker view.
-- Grant only the underlying read privileges required by that validated operation.
grant select on public.import_jobs, public.claims, public.staged_subitem_headers,
  public.staged_subitem_details, public.claim_updates, public.claim_derived_metrics
to service_role;

-- Neither application role receives mutation rights. C1 importer RPC execution
-- remains service_role-only.
revoke insert, update, delete, truncate, references, trigger
on all tables in schema public from anon, authenticated;

create or replace function public.totalscope_health()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select true; $$;
revoke all on function public.totalscope_health() from public;
grant execute on function public.totalscope_health() to anon, authenticated;
