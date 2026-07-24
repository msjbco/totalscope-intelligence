-- TotalScope Intelligence C2.1: administrator-only Q2 validation aggregates.
-- This interface intentionally avoids granting browser roles access to restricted
-- claim-update fields. The definer boundary returns aggregate counts only after
-- authenticating the caller against the existing active staging-admin model.

create or replace function public.get_q2_2026_import_validation()
returns table (
  import_job_id uuid,
  import_status public.import_status,
  claim_count bigint,
  complete_status_count bigint,
  closed_status_count bigint,
  staged_subitem_header_count bigint,
  staged_subitem_detail_count bigint,
  update_count bigint,
  unmatched_update_row_count bigint,
  unmatched_update_item_id_count bigint,
  unique_post_id_count bigint,
  additional_rcv_exact_match_count bigint,
  additional_rcv_tolerance_only_count bigint,
  additional_rcv_mismatch_count bigint,
  additional_rcv_missing_component_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Administrator authentication required.'
      using errcode = '42501';
  end if;

  if not private.is_staging_admin() then
    raise exception 'Active staging administrator role required.'
      using errcode = '42501';
  end if;

  return query
  select
    j.id,
    j.status,
    (select count(*) from public.claims c where c.import_job_id = j.id),
    (select count(*) from public.claims c where c.import_job_id = j.id and c.raw_status = 'Complete'),
    (select count(*) from public.claims c where c.import_job_id = j.id and c.raw_status = 'Closed'),
    (select count(*) from public.staged_subitem_headers sh where sh.import_job_id = j.id),
    (select count(*) from public.staged_subitem_details sd where sd.import_job_id = j.id),
    (select count(*) from public.claim_updates u where u.import_job_id = j.id),
    (select count(*) from public.claim_updates u where u.import_job_id = j.id and u.unmatched_source),
    (select count(distinct u.referenced_monday_item_id) from public.claim_updates u where u.import_job_id = j.id and u.unmatched_source),
    (select count(distinct u.monday_post_id) from public.claim_updates u where u.import_job_id = j.id),
    (select count(*) from public.claim_derived_metrics dm where dm.import_job_id = j.id and dm.reconciliation_status = 'exact_match'),
    (select count(*) from public.claim_derived_metrics dm where dm.import_job_id = j.id and dm.reconciliation_status = 'tolerance_match'),
    (select count(*) from public.claim_derived_metrics dm where dm.import_job_id = j.id and dm.reconciliation_status = 'mismatch'),
    (select count(*) from public.claim_derived_metrics dm where dm.import_job_id = j.id and dm.reconciliation_status = 'missing_component')
  from public.import_jobs j
  where j.source_period = '2026-Q2'
  order by j.started_at desc, j.id desc;
end;
$$;

alter function public.get_q2_2026_import_validation() owner to postgres;
revoke all on function public.get_q2_2026_import_validation() from public, anon, authenticated;
grant execute on function public.get_q2_2026_import_validation() to authenticated;

comment on function public.get_q2_2026_import_validation() is
  'Returns fixed Q2 import-validation aggregates only to active staging administrators; no restricted source or update rows are exposed.';
