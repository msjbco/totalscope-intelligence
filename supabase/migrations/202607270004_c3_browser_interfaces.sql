-- TotalScope Intelligence C3: browser-safe operational interfaces.
-- Canonical mutation remains service-role only. Browser roles receive reviewed,
-- column-limited read surfaces; raw payment events and ingestion artifacts remain admin-only.

create policy "active users read clients"
on public.clients for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read branches"
on public.branches for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read operational people"
on public.operational_people for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read operational files"
on public.operational_files for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read file status"
on public.file_status_events for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read file assignments"
on public.file_assignments for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read approved file financial facts"
on public.file_financial_facts for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read approved invoice charges"
on public.billing_invoice_charges for select to authenticated
using ((select private.is_active_application_user()));
create policy "active users read invoice headers"
on public.billing_invoices for select to authenticated
using ((select private.is_active_application_user()));

create policy "staging admins read C3 ingestion runs"
on public.ingestion_runs for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read C3 ingestion issues"
on public.ingestion_issues for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read C3 lineage"
on public.canonical_field_lineage for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read C3 normalization attempts"
on public.normalization_attempts for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read payment events"
on public.payment_events for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read refund events"
on public.refund_events for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read payment failures"
on public.payment_failure_events for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read disputes"
on public.dispute_events for select to authenticated
using ((select private.is_staging_admin()));
create policy "staging admins read processor fees"
on public.processor_fee_events for select to authenticated
using ((select private.is_staging_admin()));

grant select (id, stable_client_id, display_name, active) on public.clients to authenticated;
grant select (id, client_id, stable_branch_id, display_name, active) on public.branches to authenticated;
grant select (id, stable_user_id, display_name, active) on public.operational_people to authenticated;
grant select (
  id, stable_file_id, client_id, branch_id, service_type, current_status,
  submitted_at, submitted_at_availability, completed_at, completed_at_availability,
  carrier_source_name, financial_availability, source_last_observed_at
) on public.operational_files to authenticated;
grant select (operational_file_id, status, effective_at) on public.file_status_events to authenticated;
grant select (operational_file_id, operational_person_id, assignment_type, started_at, ended_at)
on public.file_assignments to authenticated;
grant select (operational_file_id, metric_key, amount_minor, currency_code, availability)
on public.file_financial_facts to authenticated;
grant select (id, operational_file_id, client_id, invoice_date, status, currency_code)
on public.billing_invoices to authenticated;
grant select (billing_invoice_id, charge_type, amount_minor, currency_code, availability, client_billable, voided)
on public.billing_invoice_charges to authenticated;

grant select (id, source_system, dataset_type, ingestion_mode, started_at, completed_at, status,
  source_record_count, accepted_record_count, quarantined_record_count,
  rejected_record_count, warning_count, error_count)
on public.ingestion_runs to authenticated;
grant select (id, ingestion_run_id, issue_type, severity, status, description, suggested_action, created_at)
on public.ingestion_issues to authenticated;
grant select (canonical_entity_type, canonical_entity_id, canonical_field_name,
  source_field_path, transformation_version, availability, confidence, source_observed_at)
on public.canonical_field_lineage to authenticated;
grant select (ingestion_run_id, outcome) on public.normalization_attempts to authenticated;
grant select (amount_minor, currency_code, status, settled_at, operational_file_id) on public.payment_events to authenticated;
grant select (amount_minor, currency_code, status, refunded_at) on public.refund_events to authenticated;
grant select (amount_minor, amount_availability, currency_code, failure_code, failed_at) on public.payment_failure_events to authenticated;
grant select (amount_minor, currency_code, status, opened_at) on public.dispute_events to authenticated;
grant select (amount_minor, currency_code, assessed_at) on public.processor_fee_events to authenticated;

create view public.c3_operations_files
with (security_invoker = true)
as
select
  f.id,
  f.stable_file_id,
  c.id as client_id,
  c.stable_client_id,
  c.display_name as client_name,
  b.id as branch_id,
  b.stable_branch_id,
  b.display_name as branch_name,
  f.service_type,
  f.current_status,
  f.submitted_at,
  f.submitted_at_availability,
  f.completed_at,
  f.completed_at_availability,
  f.carrier_source_name,
  f.financial_availability,
  f.source_last_observed_at,
  coalesce(fin.initial_rcv_minor, null) as initial_rcv_minor,
  coalesce(fin.final_rcv_minor, null) as final_rcv_minor,
  fin.initial_availability,
  fin.final_availability,
  charges.approved_charge_minor
from public.operational_files f
join public.clients c on c.id = f.client_id
join public.branches b on b.id = f.branch_id
left join lateral (
  select
    max(ff.amount_minor) filter (where ff.metric_key = 'initial_rcv') as initial_rcv_minor,
    max(ff.amount_minor) filter (where ff.metric_key = 'final_rcv') as final_rcv_minor,
    max(ff.availability::text) filter (where ff.metric_key = 'initial_rcv') as initial_availability,
    max(ff.availability::text) filter (where ff.metric_key = 'final_rcv') as final_availability
  from public.file_financial_facts ff
  where ff.operational_file_id = f.id
) fin on true
left join lateral (
  select sum(ic.amount_minor) filter (
    where ic.availability = 'captured' and ic.client_billable and not ic.voided
  ) as approved_charge_minor
  from public.billing_invoices i
  join public.billing_invoice_charges ic on ic.billing_invoice_id = i.id
  where i.operational_file_id = f.id
) charges on true;

create view public.c3_handler_performance_inputs
with (security_invoker = true)
as
select
  p.id as handler_id,
  p.stable_user_id,
  p.display_name,
  a.operational_file_id,
  f.stable_file_id,
  f.submitted_at,
  f.completed_at,
  f.current_status,
  f.carrier_source_name,
  max(ff.amount_minor) filter (where ff.metric_key = 'initial_rcv') as initial_rcv_minor,
  max(ff.amount_minor) filter (where ff.metric_key = 'final_rcv') as final_rcv_minor
from public.file_assignments a
join public.operational_people p on p.id = a.operational_person_id
join public.operational_files f on f.id = a.operational_file_id
left join public.file_financial_facts ff on ff.operational_file_id = f.id
where a.assignment_type = 'claim_handler' and a.ended_at is null
group by p.id, p.stable_user_id, p.display_name, a.operational_file_id,
  f.stable_file_id, f.submitted_at, f.completed_at, f.current_status, f.carrier_source_name;

create view public.c3_data_health
with (security_invoker = true)
as
select
  r.id as ingestion_run_id,
  r.source_system,
  r.dataset_type,
  r.status,
  r.started_at,
  r.completed_at,
  r.source_record_count,
  r.accepted_record_count,
  r.quarantined_record_count,
  r.rejected_record_count,
  r.warning_count,
  r.error_count,
  count(i.id) as open_issue_count
from public.ingestion_runs r
left join public.ingestion_issues i
  on i.ingestion_run_id = r.id and i.status = 'pending'
group by r.id;

revoke all on public.c3_operations_files, public.c3_handler_performance_inputs, public.c3_data_health
from public, anon;
grant select on public.c3_operations_files, public.c3_handler_performance_inputs to authenticated;
grant select on public.c3_data_health to authenticated;

revoke insert, update, delete, truncate, references, trigger
on all tables in schema public from anon, authenticated;

comment on view public.c3_operations_files is
  'Viewer-safe file and approved financial facts; excludes payment identifiers, raw artifacts, and reconciliation actions.';
comment on view public.c3_handler_performance_inputs is
  'Viewer-safe inputs only. Comparative eligibility and KPI calculations remain in the versioned Analytics Engine.';
comment on view public.c3_data_health is
  'Administrator-only through underlying RLS; exposes aggregate ingestion health without raw artifacts.';
