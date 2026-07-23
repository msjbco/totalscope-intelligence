-- TotalScope Intelligence C1: provenance-first Monday archive foundation.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Migration-time compatibility probe: execute the exact pgcrypto bytea/text
-- signature used by source-row hashing on the target PostgreSQL version.
do $$
declare
  v_digest text;
begin
  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'Required function extensions.digest(bytea,text) is unavailable';
  end if;
  v_digest := encode(
    extensions.digest(convert_to('abc', 'UTF8'), 'sha256'::text),
    'hex'
  );
  if v_digest <> 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' then
    raise exception 'pgcrypto SHA-256 compatibility probe returned %', v_digest;
  end if;
end;
$$;

create type public.import_status as enum ('pending','running','completed','completed_with_warnings','failed','superseded');
create type public.source_row_type as enum ('claim','subitem_header','subitem_detail','update');
create type public.availability_status as enum ('captured','not_captured','partially_captured','invalid','not_applicable');
create type public.review_status as enum ('pending','in_review','resolved','accepted','rejected');
create type public.timezone_status as enum ('explicit_offset','explicit_timezone','assumed_reporting_timezone','unknown_timezone','date_only','unparseable');

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_type text not null,
  source_period text not null,
  source_filename text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  importer_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status public.import_status not null default 'pending'::public.import_status,
  source_workbook_metadata jsonb not null default '{}'::jsonb,
  source_row_counts jsonb not null default '{}'::jsonb,
  parsed_row_counts jsonb not null default '{}'::jsonb,
  accepted_counts jsonb not null default '{}'::jsonb,
  quarantined_counts jsonb not null default '{}'::jsonb,
  rejected_counts jsonb not null default '{}'::jsonb,
  warning_count integer not null default 0,
  error_count integer not null default 0,
  run_fingerprint text not null,
  execution_actor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_sha256, importer_version)
);

create table public.source_files (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_type text not null,
  reporting_period text not null,
  filename text not null,
  sha256 text not null,
  metadata jsonb not null,
  import_job_id uuid not null references public.import_jobs(id),
  created_at timestamptz not null default now(),
  unique (source_system, sha256)
);

create table public.source_worksheets (
  id uuid primary key default gen_random_uuid(),
  source_file_id uuid not null references public.source_files(id),
  import_job_id uuid not null references public.import_jobs(id),
  worksheet_name text not null,
  worksheet_index integer not null,
  physical_row_count integer not null,
  source_column_count integer not null,
  header_row_number integer not null,
  header_mapping jsonb not null,
  created_at timestamptz not null default now(),
  unique (source_file_id, worksheet_index)
);

create table public.source_rows (
  id uuid primary key default gen_random_uuid(),
  source_worksheet_id uuid not null references public.source_worksheets(id),
  import_job_id uuid not null references public.import_jobs(id),
  physical_row_number integer not null,
  detected_row_type public.source_row_type not null,
  source_item_id text,
  raw_row jsonb not null,
  normalized_row jsonb not null,
  parsing_status text not null default 'parsed',
  parsing_warnings jsonb not null default '[]'::jsonb,
  row_fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (source_worksheet_id, physical_row_number)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_type text not null check (organization_type in ('contractor','carrier')),
  display_name text not null,
  normalized_name text not null,
  source_system text not null default 'monday_archive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_type, normalized_name)
);

create table public.organization_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  source_system text not null,
  raw_alias text not null,
  normalized_alias text not null,
  import_job_id uuid not null references public.import_jobs(id),
  created_at timestamptz not null default now(),
  unique (source_system, organization_id, normalized_alias)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  normalized_name text not null,
  person_type text not null check (person_type in ('claim_handler','admin','adjuster')),
  created_at timestamptz not null default now(),
  unique (person_type, normalized_name)
);

create table public.person_aliases (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id),
  source_system text not null,
  raw_alias text not null,
  normalized_alias text not null,
  import_job_id uuid not null references public.import_jobs(id),
  created_at timestamptz not null default now(),
  unique (source_system, person_id, normalized_alias)
);

create table public.staged_claim_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs(id),
  source_row_id uuid not null references public.source_rows(id),
  source_item_id text not null,
  raw_values jsonb not null,
  normalized_values jsonb not null,
  raw_status text,
  normalized_status text,
  raw_dates jsonb not null,
  parsed_dates jsonb not null,
  source_timezone_metadata jsonb not null,
  identity_candidates jsonb not null,
  financial_source_values jsonb not null,
  validation_outcomes jsonb not null,
  promotion_status text not null,
  review_status public.review_status not null default 'pending',
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  unique (import_job_id, source_item_id)
);

create table public.staged_subitem_headers (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs(id),
  source_row_id uuid not null references public.source_rows(id),
  source_row_number integer not null,
  preceding_claim_item_id text,
  inferred_section text,
  inference_method text not null,
  inference_confidence text not null,
  raw_values jsonb not null,
  normalized_values jsonb not null,
  parsing_status text not null default 'staged',
  review_status public.review_status not null default 'pending',
  unique (import_job_id, source_row_number)
);

create table public.staged_subitem_details (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs(id),
  source_row_id uuid not null references public.source_rows(id),
  source_row_number integer not null,
  preceding_claim_item_id text,
  preceding_header_row integer,
  inferred_section text,
  inference_method text not null,
  inference_confidence text not null,
  raw_values jsonb not null,
  normalized_values jsonb not null,
  parsing_status text not null default 'staged',
  review_status public.review_status not null default 'pending',
  unique (import_job_id, source_row_number)
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_record_key text not null,
  monday_item_id text not null,
  raw_claim_name text,
  display_name text,
  raw_status text,
  normalized_status text not null,
  lifecycle_state text,
  contractor_id uuid references public.organizations(id),
  carrier_id uuid references public.organizations(id),
  assigned_staff_id uuid references public.people(id),
  source_created_date date,
  assigned_date date,
  closed_date date,
  status_change_date date,
  service_type text,
  property_type text,
  import_job_id uuid not null references public.import_jobs(id),
  source_row_id uuid not null references public.source_rows(id),
  source_confidence text not null default 'source_provided',
  source_last_observed_at timestamp,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, monday_item_id),
  check (service_type is null),
  check (property_type is null)
);

create table public.claim_financial_facts (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id),
  source_field_name text not null,
  normalized_metric_name text not null,
  raw_value jsonb,
  parsed_numeric_value numeric,
  currency text not null default 'USD',
  source_availability_status public.availability_status not null,
  source_worksheet text not null,
  source_row integer not null,
  source_column_index integer not null,
  source_column_header text not null,
  transformation_version text not null,
  calculation_status text not null default 'source_provided',
  confidence text not null default 'source_provided',
  review_status public.review_status not null default 'pending',
  import_job_id uuid not null references public.import_jobs(id),
  unique (claim_id, normalized_metric_name, import_job_id)
);

create table public.claim_derived_metrics (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id),
  metric_name text not null,
  metric_version text not null,
  calculated_value numeric,
  input_fact_references jsonb not null,
  calculated_at timestamptz not null default now(),
  source_comparison_value numeric,
  reconciliation_status text not null,
  tolerance numeric not null default 0,
  difference numeric,
  confidence text not null,
  import_job_id uuid not null references public.import_jobs(id),
  unique (claim_id, metric_name, metric_version, import_job_id)
);

create table public.claim_updates (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  monday_post_id text not null,
  referenced_monday_item_id text,
  claim_id uuid references public.claims(id),
  unmatched_source boolean not null,
  update_body text,
  blank_body boolean not null,
  duplicate_body_fingerprint text,
  duplicate_body boolean not null default false,
  source_timestamp_raw text,
  parsed_timestamp timestamp,
  timezone_status public.timezone_status not null,
  author_name text,
  source_worksheet text not null,
  source_row integer not null,
  import_job_id uuid not null references public.import_jobs(id),
  raw_row jsonb not null,
  created_at timestamptz not null default now(),
  unique (source_system, monday_post_id)
);

create table public.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  deterministic_key text not null unique,
  issue_type text not null,
  severity text not null,
  status public.review_status not null default 'pending',
  source_entity text not null,
  source_row_id uuid references public.source_rows(id),
  claim_id uuid references public.claims(id),
  description text not null,
  evidence jsonb not null,
  suggested_action text,
  assigned_reviewer uuid,
  resolution_notes text,
  resolved_at timestamptz,
  import_job_id uuid not null references public.import_jobs(id),
  created_at timestamptz not null default now()
);

create index claims_status_idx on public.claims(normalized_status);
create index claims_contractor_idx on public.claims(contractor_id);
create index claims_carrier_idx on public.claims(carrier_id);
create index claim_updates_claim_timestamp_idx on public.claim_updates(claim_id, parsed_timestamp desc, source_row desc);
create index claim_updates_unmatched_idx on public.claim_updates(unmatched_source) where unmatched_source;
create index data_quality_issues_queue_idx on public.data_quality_issues(status, severity, issue_type);
create index source_rows_item_idx on public.source_rows(source_item_id);

create view public.q2_2026_import_validation as
select
  j.id as import_job_id,
  j.status as import_status,
  (select count(*) from public.claims c where c.import_job_id=j.id) as claim_count,
  (select count(*) from public.claims c where c.import_job_id=j.id and c.raw_status='Complete') as complete_status_count,
  (select count(*) from public.claims c where c.import_job_id=j.id and c.raw_status='Closed') as closed_status_count,
  (select count(*) from public.staged_subitem_headers sh where sh.import_job_id=j.id) as staged_subitem_header_count,
  (select count(*) from public.staged_subitem_details sd where sd.import_job_id=j.id) as staged_subitem_detail_count,
  (select count(*) from public.claim_updates u where u.import_job_id=j.id) as update_count,
  (select count(*) from public.claim_updates u where u.import_job_id=j.id and u.unmatched_source) as unmatched_update_row_count,
  (select count(distinct u.referenced_monday_item_id) from public.claim_updates u where u.import_job_id=j.id and u.unmatched_source) as unmatched_update_item_id_count,
  (select count(distinct u.monday_post_id) from public.claim_updates u where u.import_job_id=j.id) as unique_post_id_count,
  (select count(*) from public.claim_derived_metrics dm where dm.import_job_id=j.id and dm.reconciliation_status='exact_match') as additional_rcv_exact_match_count,
  (select count(*) from public.claim_derived_metrics dm where dm.import_job_id=j.id and dm.reconciliation_status='tolerance_match') as additional_rcv_tolerance_only_count,
  (select count(*) from public.claim_derived_metrics dm where dm.import_job_id=j.id and dm.reconciliation_status='mismatch') as additional_rcv_mismatch_count,
  (select count(*) from public.claim_derived_metrics dm where dm.import_job_id=j.id and dm.reconciliation_status='missing_component') as additional_rcv_missing_component_count
from public.import_jobs j
where j.source_period = '2026-Q2';

alter table public.import_jobs enable row level security;
alter table public.source_files enable row level security;
alter table public.source_worksheets enable row level security;
alter table public.source_rows enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_aliases enable row level security;
alter table public.people enable row level security;
alter table public.person_aliases enable row level security;
alter table public.staged_claim_rows enable row level security;
alter table public.staged_subitem_headers enable row level security;
alter table public.staged_subitem_details enable row level security;
alter table public.claims enable row level security;
alter table public.claim_financial_facts enable row level security;
alter table public.claim_derived_metrics enable row level security;
alter table public.claim_updates enable row level security;
alter table public.data_quality_issues enable row level security;

-- C1 has no production authentication. No anon/authenticated policies are created:
-- browser clients are denied by default. Server reads use a service role only.

create or replace function public.import_q2_2026_archive(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job uuid;
  v_file uuid;
  v_sheet uuid;
  v_source_row uuid;
  v_claim uuid;
  v_org uuid;
  v_person uuid;
  v_row jsonb;
  v_claim_row jsonb;
  v_fact record;
  v_update jsonb;
  v_warning_count integer := 0;
  v_finalize boolean := coalesce((payload#>>'{control,finalize}')::boolean, false);
  v_phase text := coalesce(payload#>>'{control,phase}', 'unspecified');
  v_claim_count integer;
  v_complete_count integer;
  v_closed_count integer;
  v_subitem_header_count integer;
  v_subitem_detail_count integer;
  v_update_count integer;
  v_unmatched_update_count integer;
  v_unmatched_item_count integer;
  v_exact_count integer;
  v_tolerance_count integer;
  v_mismatch_count integer;
  v_missing_count integer;
begin
  if jsonb_array_length(payload->'source_rows') > 250
    or jsonb_array_length(payload->'claims') > 25
    or jsonb_array_length(payload->'subitem_headers') > 100
    or jsonb_array_length(payload->'subitem_details') > 100
    or jsonb_array_length(payload->'updates') > 250 then
    raise exception 'Import RPC batch exceeds its bounded row limit';
  end if;

  insert into import_jobs (
    source_system, source_type, source_period, source_filename, source_sha256,
    importer_version, status, source_workbook_metadata, run_fingerprint
  ) values (
    payload#>>'{source,system}', payload#>>'{source,type}', payload#>>'{source,period}',
    payload#>>'{source,filename}', payload#>>'{source,sha256}',
    payload#>>'{source,importer_version}', 'running'::public.import_status, payload->'source',
    payload#>>'{source,fingerprint}'
  )
  on conflict (source_sha256, importer_version) do update
    set status = 'running'::public.import_status, started_at = now(), completed_at = null
  returning id into v_job;

  insert into source_files (source_system, source_type, reporting_period, filename, sha256, metadata, import_job_id)
  values (payload#>>'{source,system}', payload#>>'{source,type}', payload#>>'{source,period}',
          payload#>>'{source,filename}', payload#>>'{source,sha256}', payload->'source', v_job)
  on conflict (source_system, sha256) do update set metadata = excluded.metadata
  returning id into v_file;

  for v_row in select value from jsonb_array_elements(payload#>'{source,worksheets}')
  loop
    insert into source_worksheets (
      source_file_id, import_job_id, worksheet_name, worksheet_index, physical_row_count,
      source_column_count, header_row_number, header_mapping
    ) values (
      v_file, v_job, v_row->>'name', (v_row->>'index')::integer, (v_row->>'rows')::integer,
      (v_row->>'columns')::integer, (v_row->>'header_row')::integer, v_row->'headers'
    ) on conflict (source_file_id, worksheet_index) do update set header_mapping = excluded.header_mapping;
  end loop;

  for v_row in select value from jsonb_array_elements(payload->'source_rows')
  loop
    select id into v_sheet from source_worksheets
      where source_file_id = v_file and worksheet_name = v_row->>'worksheet';
    insert into source_rows (
      source_worksheet_id, import_job_id, physical_row_number, detected_row_type,
      source_item_id, raw_row, normalized_row, row_fingerprint
    ) values (
      v_sheet, v_job, (v_row->>'physical_row')::integer, (v_row->>'row_type')::source_row_type,
      v_row->>'source_item_id', v_row->'raw', v_row->'normalized',
      encode(
        extensions.digest(
          convert_to((v_row->'raw')::text, 'UTF8'),
          'sha256'::text
        ),
        'hex'
      )
    ) on conflict (source_worksheet_id, physical_row_number) do nothing
    returning id into v_source_row;
  end loop;

  for v_claim_row in select value from jsonb_array_elements(payload->'claims')
  loop
    select sr.id into v_source_row from source_rows sr join source_worksheets sw on sw.id=sr.source_worksheet_id
      where sw.source_file_id=v_file and sw.worksheet_name='archive q2 2026'
        and sr.physical_row_number=(v_claim_row->>'source_row')::integer;

    if nullif(v_claim_row->>'contractor','') is not null then
      insert into organizations (organization_type, display_name, normalized_name)
      values ('contractor', v_claim_row->>'contractor', lower(regexp_replace(v_claim_row->>'contractor','[^a-zA-Z0-9]+',' ','g')))
      on conflict (organization_type, normalized_name) do update set display_name=excluded.display_name, updated_at=now()
      returning id into v_org;
      insert into organization_aliases (organization_id, source_system, raw_alias, normalized_alias, import_job_id)
      values (v_org, 'monday_archive', v_claim_row->>'contractor', lower(regexp_replace(v_claim_row->>'contractor','[^a-zA-Z0-9]+',' ','g')), v_job)
      on conflict do nothing;
    else v_org := null;
    end if;

    insert into staged_claim_rows (
      import_job_id, source_row_id, source_item_id, raw_values, normalized_values,
      raw_status, normalized_status, raw_dates, parsed_dates, source_timezone_metadata,
      identity_candidates, financial_source_values, validation_outcomes, promotion_status
    ) values (
      v_job, v_source_row, v_claim_row->>'item_id', v_claim_row, v_claim_row,
      v_claim_row->>'raw_status', v_claim_row->>'normalized_status', v_claim_row->'dates',
      v_claim_row->'dates', jsonb_build_object('policy','preserve_unknown'),
      jsonb_build_object('contractor',v_claim_row->'contractor','carrier',v_claim_row->'carrier','assignees',v_claim_row->'assignees'),
      v_claim_row->'facts', v_claim_row->'reconciliation', 'promoted'
    ) on conflict (import_job_id, source_item_id) do update set normalized_values=excluded.normalized_values;

    insert into claims (
      source_system, source_record_key, monday_item_id, raw_claim_name, display_name,
      raw_status, normalized_status, lifecycle_state, contractor_id, service_type,
      property_type, import_job_id, source_row_id
    ) values (
      'monday_archive', v_claim_row->>'item_id', v_claim_row->>'item_id',
      v_claim_row->>'raw_name', v_claim_row->>'display_name', v_claim_row->>'raw_status',
      v_claim_row->>'normalized_status',
      case when v_claim_row->>'raw_status' in ('Complete','Closed') then 'terminal_source_status' else null end,
      v_org, null, null, v_job, v_source_row
    ) on conflict (source_system, monday_item_id) do update set
      raw_claim_name=excluded.raw_claim_name, display_name=excluded.display_name,
      raw_status=excluded.raw_status, normalized_status=excluded.normalized_status,
      contractor_id=excluded.contractor_id, import_job_id=excluded.import_job_id,
      source_row_id=excluded.source_row_id, updated_at=now()
    returning id into v_claim;

    if nullif(v_claim_row#>>'{assignees,claim_handler}','') is not null then
      insert into people (display_name, normalized_name, person_type)
      values (v_claim_row#>>'{assignees,claim_handler}', lower(regexp_replace(v_claim_row#>>'{assignees,claim_handler}','[^a-zA-Z0-9]+',' ','g')), 'claim_handler')
      on conflict (person_type, normalized_name) do update set display_name=excluded.display_name
      returning id into v_person;
      insert into person_aliases (person_id, source_system, raw_alias, normalized_alias, import_job_id)
      values (v_person, 'monday_archive', v_claim_row#>>'{assignees,claim_handler}', lower(regexp_replace(v_claim_row#>>'{assignees,claim_handler}','[^a-zA-Z0-9]+',' ','g')), v_job)
      on conflict do nothing;
      update claims set assigned_staff_id=v_person where id=v_claim;
    end if;

    if nullif(v_claim_row->>'carrier','') is not null then
      insert into organizations (organization_type, display_name, normalized_name)
      values ('carrier', v_claim_row->>'carrier', lower(regexp_replace(v_claim_row->>'carrier','[^a-zA-Z0-9]+',' ','g')))
      on conflict (organization_type, normalized_name) do update set display_name=excluded.display_name, updated_at=now()
      returning id into v_org;
      insert into organization_aliases (organization_id, source_system, raw_alias, normalized_alias, import_job_id)
      values (v_org, 'monday_archive', v_claim_row->>'carrier', lower(regexp_replace(v_claim_row->>'carrier','[^a-zA-Z0-9]+',' ','g')), v_job)
      on conflict do nothing;
      update claims set carrier_id=v_org where id=v_claim;
    end if;

    for v_fact in select key, value from jsonb_each(v_claim_row->'facts')
    loop
      insert into claim_financial_facts (
        claim_id, source_field_name, normalized_metric_name, raw_value, parsed_numeric_value,
        source_availability_status, source_worksheet, source_row, source_column_index,
        source_column_header, transformation_version, import_job_id
      ) values (
        v_claim, v_fact.value->>'source_field', v_fact.key, v_fact.value->'raw',
        nullif(v_fact.value->>'parsed','')::numeric,
        (v_fact.value->>'availability')::availability_status, 'archive q2 2026',
        (v_claim_row->>'source_row')::integer, (v_fact.value->>'source_column')::integer,
        v_fact.value->>'source_field', payload#>>'{source,transformation_version}', v_job
      ) on conflict (claim_id, normalized_metric_name, import_job_id) do update
        set raw_value=excluded.raw_value, parsed_numeric_value=excluded.parsed_numeric_value,
            source_availability_status=excluded.source_availability_status;
    end loop;

    insert into claim_derived_metrics (
      claim_id, metric_name, metric_version, calculated_value, input_fact_references,
      source_comparison_value, reconciliation_status, difference, confidence, import_job_id
    ) values (
      v_claim, 'calculated_additional_rcv', 'additional-rcv-v1',
      nullif(v_claim_row#>>'{reconciliation,value}','')::numeric,
      '["initial_rcv","current_rcv"]'::jsonb,
      nullif(v_claim_row#>>'{facts,additional_secured,parsed}','')::numeric,
      v_claim_row#>>'{reconciliation,status}',
      nullif(v_claim_row#>>'{reconciliation,difference}','')::numeric,
      case when v_claim_row#>>'{reconciliation,status}'='exact_match' then 'A' else 'Limited' end,
      v_job
    ) on conflict (claim_id, metric_name, metric_version, import_job_id) do update
      set calculated_value=excluded.calculated_value, reconciliation_status=excluded.reconciliation_status,
          difference=excluded.difference;

    if v_claim_row#>>'{reconciliation,status}'='missing_component' then
      insert into data_quality_issues (deterministic_key,issue_type,severity,source_entity,source_row_id,claim_id,description,evidence,suggested_action,import_job_id)
      values ('missing-initial-rcv:'||(v_claim_row->>'item_id'),'missing_initial_rcv','warning','claim',v_source_row,v_claim,
              'Initial RCV is unavailable; no derived replacement was fabricated.',v_claim_row->'facts','Review the source record.',v_job)
      on conflict (deterministic_key) do nothing;
    end if;
    if nullif(v_claim_row#>>'{facts,percentage_increase,parsed}','')::numeric >= 4510 then
      insert into data_quality_issues (deterministic_key,issue_type,severity,source_entity,source_row_id,claim_id,description,evidence,suggested_action,import_job_id)
      values ('extreme-percentage:'||(v_claim_row->>'item_id'),'extreme_percentage_value','warning','claim',v_source_row,v_claim,
              'Percentage Increase contains an extreme source value and was preserved without correction.',
              v_claim_row#>'{facts,percentage_increase}','Confirm source units and intent.',v_job)
      on conflict (deterministic_key) do nothing;
    end if;
  end loop;

  for v_row in select value from jsonb_array_elements(payload->'subitem_headers')
  loop
    select sr.id into v_source_row from source_rows sr join source_worksheets sw on sw.id=sr.source_worksheet_id
      where sw.source_file_id=v_file and sw.worksheet_name='archive q2 2026' and sr.physical_row_number=(v_row->>'source_row')::integer;
    insert into staged_subitem_headers (import_job_id,source_row_id,source_row_number,preceding_claim_item_id,inference_method,inference_confidence,raw_values,normalized_values)
    values (v_job,v_source_row,(v_row->>'source_row')::integer,v_row->>'parent_item_id',v_row->>'inference_method',v_row->>'confidence',v_row->'raw',v_row->'raw')
    on conflict (import_job_id,source_row_number) do nothing;
  end loop;

  for v_row in select value from jsonb_array_elements(payload->'subitem_details')
  loop
    select sr.id into v_source_row from source_rows sr join source_worksheets sw on sw.id=sr.source_worksheet_id
      where sw.source_file_id=v_file and sw.worksheet_name='archive q2 2026' and sr.physical_row_number=(v_row->>'source_row')::integer;
    insert into staged_subitem_details (import_job_id,source_row_id,source_row_number,preceding_claim_item_id,preceding_header_row,inference_method,inference_confidence,raw_values,normalized_values)
    values (v_job,v_source_row,(v_row->>'source_row')::integer,v_row->>'parent_item_id',nullif(v_row->>'header_source_row','')::integer,v_row->>'inference_method',v_row->>'confidence',v_row->'raw',v_row->'raw')
    on conflict (import_job_id,source_row_number) do nothing;
  end loop;

  for v_update in select value from jsonb_array_elements(payload->'updates')
  loop
    select id into v_claim from claims where source_system='monday_archive' and monday_item_id=v_update->>'item_id';
    insert into claim_updates (
      source_system,monday_post_id,referenced_monday_item_id,claim_id,unmatched_source,
      update_body,blank_body,duplicate_body_fingerprint,duplicate_body,source_timestamp_raw,
      parsed_timestamp,timezone_status,author_name,source_worksheet,source_row,import_job_id,raw_row
    ) values (
      'monday_archive',v_update->>'post_id',v_update->>'item_id',v_claim,not (v_update->>'matched')::boolean,
      v_update->>'body',(v_update->>'blank_body')::boolean,v_update->>'body_fingerprint',
      (v_update->>'duplicate_body')::boolean,v_update#>>'{timestamp,raw}',
      nullif(v_update#>>'{timestamp,parsed}','')::timestamp,
      (v_update#>>'{timestamp,timezone_status}')::timezone_status,v_update->>'author',
      'updates',(v_update->>'source_row')::integer,v_job,v_update->'raw'
    ) on conflict (source_system,monday_post_id) do nothing;

    if not (v_update->>'matched')::boolean then
      insert into data_quality_issues (deterministic_key,issue_type,severity,source_entity,description,evidence,suggested_action,import_job_id)
      values ('unmatched-update:'||(v_update->>'post_id'),'unmatched_update_item_id','warning','claim_update',
              'Update references a Monday Item ID outside the Q2 archive claim set.',
              jsonb_build_object('post_id',v_update->>'post_id','item_id',v_update->>'item_id','source_row',v_update->>'source_row'),
              'Resolve against another archive or retain in quarantine.',v_job)
      on conflict (deterministic_key) do nothing;
    end if;
    if (v_update->>'blank_body')::boolean then
      insert into data_quality_issues (deterministic_key,issue_type,severity,source_entity,description,evidence,suggested_action,import_job_id)
      values ('blank-update:'||(v_update->>'post_id'),'blank_update_body','info','claim_update',
              'Update body is blank in the source.',jsonb_build_object('post_id',v_update->>'post_id'),'Retain for provenance; no text correction required.',v_job)
      on conflict (deterministic_key) do nothing;
    end if;
    if (v_update->>'duplicate_body')::boolean then
      insert into data_quality_issues (deterministic_key,issue_type,severity,source_entity,description,evidence,suggested_action,import_job_id)
      values ('duplicate-update-body:'||(v_update->>'body_fingerprint'),'duplicate_update_body','info','claim_update',
              'Multiple source updates share the same exact trimmed-body fingerprint.',
              jsonb_build_object('body_fingerprint',v_update->>'body_fingerprint'),'Review only when operationally material; preserve every Post ID.',v_job)
      on conflict (deterministic_key) do nothing;
    end if;
  end loop;

  if v_finalize then
    insert into data_quality_issues (deterministic_key,issue_type,severity,source_entity,description,evidence,suggested_action,import_job_id)
    values
      ('duplicate-header:archive:ch-update','duplicate_header_disambiguation','info','worksheet','Duplicate CH Update headers are mapped by position.',jsonb_build_object('worksheet','archive q2 2026'),'Use the stored positional header map.',v_job),
      ('duplicate-header:updates:content-type','duplicate_header_disambiguation','info','worksheet','Duplicate Content Type headers are mapped by position.',jsonb_build_object('worksheet','updates'),'Use the stored positional header map.',v_job),
      ('timezone:q2-2026','unknown_timezone','warning','import_job','Update timestamps have no source timezone and remain naive.',jsonb_build_object('policy','preserve_unknown'),'Approve a reversible reporting-timezone assumption before UTC conversion.',v_job),
      ('subitems:q2-2026','unresolved_subitem_meaning','warning','staging','Subitems use positional parentage and are not canonically promoted.',jsonb_build_object('detail_count',1359),'Review semantics before canonical promotion.',v_job)
    on conflict (deterministic_key) do nothing;

    select count(*), count(*) filter (where raw_status='Complete'), count(*) filter (where raw_status='Closed')
      into v_claim_count, v_complete_count, v_closed_count from claims where import_job_id=v_job;
    select count(*) into v_subitem_header_count from staged_subitem_headers where import_job_id=v_job;
    select count(*) into v_subitem_detail_count from staged_subitem_details where import_job_id=v_job;
    select count(*), count(*) filter (where unmatched_source), count(distinct referenced_monday_item_id) filter (where unmatched_source)
      into v_update_count, v_unmatched_update_count, v_unmatched_item_count from claim_updates where import_job_id=v_job;
    select
      count(*) filter (where reconciliation_status='exact_match'),
      count(*) filter (where reconciliation_status='tolerance_match'),
      count(*) filter (where reconciliation_status='mismatch'),
      count(*) filter (where reconciliation_status='missing_component')
      into v_exact_count, v_tolerance_count, v_mismatch_count, v_missing_count
      from claim_derived_metrics where import_job_id=v_job;

    if v_claim_count <> 214 or v_complete_count <> 177 or v_closed_count <> 37
      or v_subitem_header_count <> 148 or v_subitem_detail_count <> 1359
      or v_update_count <> 5957 or v_unmatched_update_count <> 58 or v_unmatched_item_count <> 56
      or v_exact_count <> 213 or v_tolerance_count <> 0 or v_mismatch_count <> 0 or v_missing_count <> 1 then
      raise exception 'Import finalization rejected incomplete counts: claims %, complete %, closed %, headers %, details %, updates %, unmatched rows %, unmatched IDs %, exact %, tolerance %, mismatch %, missing %',
        v_claim_count, v_complete_count, v_closed_count, v_subitem_header_count, v_subitem_detail_count,
        v_update_count, v_unmatched_update_count, v_unmatched_item_count, v_exact_count,
        v_tolerance_count, v_mismatch_count, v_missing_count;
    end if;

    select count(*) into v_warning_count from data_quality_issues where import_job_id=v_job and severity='warning';
    update import_jobs set
      status=case
        when v_warning_count>0 then 'completed_with_warnings'::public.import_status
        else 'completed'::public.import_status
      end,
      completed_at=now(),
      source_row_counts=jsonb_build_object('archive',1721,'updates',5957),
      parsed_row_counts=jsonb_build_object('claims',214,'subitem_headers',148,'subitem_details',1359,'updates',5957),
      accepted_counts=jsonb_build_object('claims',214,'updates',5957),
      quarantined_counts=jsonb_build_object('unmatched_updates',58),
      warning_count=v_warning_count,
      error_count=0,
      metadata=metadata||jsonb_build_object('database_batching','bounded-v1')
    where id=v_job;
  end if;

  return jsonb_build_object(
    'import_job_id',v_job,
    'status',case when v_finalize then 'completed_with_warnings' else 'running' end,
    'phase',v_phase,
    'batch_size',coalesce((payload#>>'{control,batch_size}')::integer,0),
    'claims',case when v_finalize then v_claim_count else null end,
    'updates',case when v_finalize then v_update_count else null end
  );
exception when others then
  if v_job is not null then
    update import_jobs set status='failed'::public.import_status,completed_at=now(),error_count=1,
      metadata=metadata||jsonb_build_object('error',sqlerrm) where id=v_job;
  end if;
  raise;
end;
$$;

revoke all on function public.import_q2_2026_archive(jsonb) from public, anon, authenticated;
grant execute on function public.import_q2_2026_archive(jsonb) to service_role;
grant select on public.q2_2026_import_validation to service_role;

create or replace function public.mark_q2_2026_import_failed(
  workbook_sha256 text,
  version text,
  failure_message text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.import_jobs
  set status='failed'::public.import_status,
      completed_at=now(),
      error_count=error_count+1,
      metadata=metadata||jsonb_build_object('last_error',left(failure_message,2000))
  where source_sha256=workbook_sha256 and importer_version=version;
$$;
revoke all on function public.mark_q2_2026_import_failed(text,text,text) from public, anon, authenticated;
grant execute on function public.mark_q2_2026_import_failed(text,text,text) to service_role;

-- Migration-time regression probe for the exact enum assignments used by
-- retry, finalization, and failure marking.
do $$
declare
  v_probe_id uuid;
  v_probe_status public.import_status;
begin
  insert into public.import_jobs (
    source_system, source_type, source_period, source_filename, source_sha256,
    importer_version, status, run_fingerprint
  ) values (
    'migration_probe', 'probe', 'probe', 'probe',
    repeat('0',64), 'enum-assignment-probe',
    'running'::public.import_status, 'probe'
  )
  returning id into v_probe_id;

  update public.import_jobs
  set status=case
    when true then 'completed_with_warnings'::public.import_status
    else 'completed'::public.import_status
  end
  where id=v_probe_id
  returning status into v_probe_status;
  if v_probe_status <> 'completed_with_warnings'::public.import_status then
    raise exception 'Finalize enum assignment probe failed: %', v_probe_status;
  end if;

  update public.import_jobs
  set status='failed'::public.import_status
  where id=v_probe_id
  returning status into v_probe_status;
  if v_probe_status <> 'failed'::public.import_status then
    raise exception 'Failure enum assignment probe failed: %', v_probe_status;
  end if;

  delete from public.import_jobs where id=v_probe_id;
end;
$$;

create or replace function public.prevent_immutable_source_mutation()
returns trigger language plpgsql as $$
begin
  raise exception '% records are immutable; append a superseding import instead', tg_table_name;
end;
$$;
create trigger source_rows_immutable before update or delete on public.source_rows for each row execute function public.prevent_immutable_source_mutation();
create trigger claim_updates_immutable before update or delete on public.claim_updates for each row execute function public.prevent_immutable_source_mutation();
