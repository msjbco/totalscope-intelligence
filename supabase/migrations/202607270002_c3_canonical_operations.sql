-- TotalScope Intelligence C3: generalized canonical operational records and lineage.
-- C1 claims remain unchanged and may be linked through legacy_claim_id.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  stable_client_id text not null unique,
  display_name text not null,
  normalized_name text not null,
  active boolean not null default true,
  first_ingestion_run_id uuid not null references public.ingestion_runs(id),
  last_ingestion_run_id uuid not null references public.ingestion_runs(id),
  source_last_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_aliases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  source_system text not null,
  external_id text,
  raw_alias text not null,
  normalized_alias text not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  created_at timestamptz not null default now(),
  unique (source_system, external_id),
  unique (client_id, source_system, normalized_alias)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  stable_branch_id text not null unique,
  display_name text not null,
  normalized_name text not null,
  active boolean not null default true,
  first_ingestion_run_id uuid not null references public.ingestion_runs(id),
  last_ingestion_run_id uuid not null references public.ingestion_runs(id),
  source_last_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, normalized_name)
);

create table public.branch_aliases (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  source_system text not null,
  external_id text,
  raw_alias text not null,
  normalized_alias text not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  created_at timestamptz not null default now(),
  unique (source_system, external_id),
  unique (branch_id, source_system, normalized_alias)
);

create table public.operational_people (
  id uuid primary key default gen_random_uuid(),
  stable_user_id text not null unique,
  display_name text not null,
  normalized_name text not null,
  work_email text,
  active boolean not null default true,
  legacy_person_id uuid unique references public.people(id),
  first_ingestion_run_id uuid not null references public.ingestion_runs(id),
  last_ingestion_run_id uuid not null references public.ingestion_runs(id),
  source_last_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index operational_people_work_email_idx
  on public.operational_people(lower(work_email))
  where work_email is not null;

create table public.operational_files (
  id uuid primary key default gen_random_uuid(),
  stable_file_id text not null unique,
  legacy_claim_id uuid unique references public.claims(id),
  client_id uuid not null references public.clients(id),
  branch_id uuid not null references public.branches(id),
  service_type text not null check (service_type in ('estimate_only','claim_handling')),
  current_status text not null,
  current_status_authority text not null default 'source_provided',
  submitted_at timestamptz,
  submitted_at_availability public.availability_status not null,
  completed_at timestamptz,
  completed_at_availability public.availability_status not null,
  carrier_id uuid references public.organizations(id),
  carrier_source_name text,
  financial_availability public.availability_status not null,
  source_timezone text,
  source_timezone_status public.timezone_status not null,
  first_ingestion_run_id uuid not null references public.ingestion_runs(id),
  last_ingestion_run_id uuid not null references public.ingestion_runs(id),
  source_last_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    submitted_at is not null
    or submitted_at_availability in ('not_captured','invalid','not_applicable')
  ),
  check (
    completed_at is not null
    or completed_at_availability in ('not_captured','invalid','not_applicable')
  ),
  check (completed_at is null or submitted_at is null or completed_at >= submitted_at)
);

create table public.file_status_events (
  id uuid primary key default gen_random_uuid(),
  stable_status_event_id text not null unique,
  operational_file_id uuid not null references public.operational_files(id),
  status text not null,
  effective_at timestamptz not null,
  source_timezone text,
  source_timezone_status public.timezone_status not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.file_assignments (
  id uuid primary key default gen_random_uuid(),
  stable_assignment_id text not null unique,
  operational_file_id uuid not null references public.operational_files(id),
  operational_person_id uuid not null references public.operational_people(id),
  assignment_type text not null check (
    assignment_type in ('client_sales_rep','client_sales_manager','totalscope_estimator','totalscope_claim_handler')
  ),
  started_at timestamptz not null,
  ended_at timestamptz,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create unique index file_assignments_one_current_idx
  on public.file_assignments(operational_file_id, assignment_type)
  where ended_at is null;

create table public.file_notes (
  id uuid primary key default gen_random_uuid(),
  stable_note_id text not null unique,
  operational_file_id uuid not null references public.operational_files(id),
  note_body text,
  note_body_availability public.availability_status not null,
  source_created_at timestamptz not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now(),
  check (
    note_body is not null
    or note_body_availability in ('not_captured','invalid','not_applicable')
  )
);

create table public.file_documents (
  id uuid primary key default gen_random_uuid(),
  stable_document_id text not null unique,
  operational_file_id uuid not null references public.operational_files(id),
  document_type text not null,
  filename text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  protected_storage_pointer text,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.file_tags (
  id uuid primary key default gen_random_uuid(),
  stable_tag_event_id text not null unique,
  operational_file_id uuid not null references public.operational_files(id),
  tag text not null,
  normalized_tag text not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.file_custom_field_facts (
  id uuid primary key default gen_random_uuid(),
  stable_custom_field_fact_id text not null unique,
  operational_file_id uuid not null references public.operational_files(id),
  field_key text not null,
  raw_value jsonb,
  normalized_value jsonb,
  availability public.availability_status not null,
  mapping_version text not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.canonical_field_lineage (
  id uuid primary key default gen_random_uuid(),
  canonical_entity_type text not null,
  canonical_entity_id uuid not null,
  canonical_field_name text not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  source_field_path text not null,
  transformation_version text not null,
  authority_rule text not null,
  availability public.availability_status not null,
  confidence text not null,
  source_observed_at timestamptz,
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique (
    canonical_entity_type, canonical_entity_id, canonical_field_name,
    ingestion_record_id, transformation_version
  )
);

create index clients_active_name_idx on public.clients(active, normalized_name);
create index branches_client_active_idx on public.branches(client_id, active, normalized_name);
create index operational_files_client_status_idx on public.operational_files(client_id, current_status);
create index operational_files_branch_status_idx on public.operational_files(branch_id, current_status);
create index operational_files_service_submitted_idx on public.operational_files(service_type, submitted_at);
create index operational_files_completed_idx on public.operational_files(completed_at) where completed_at is not null;
create index file_status_events_file_effective_idx on public.file_status_events(operational_file_id, effective_at desc);
create index file_assignments_person_effective_idx on public.file_assignments(operational_person_id, started_at, ended_at);
create index file_notes_file_created_idx on public.file_notes(operational_file_id, source_created_at desc);
create index canonical_field_lineage_entity_idx
  on public.canonical_field_lineage(canonical_entity_type, canonical_entity_id, canonical_field_name);
create index canonical_field_lineage_source_idx on public.canonical_field_lineage(ingestion_record_id);

alter table public.clients enable row level security;
alter table public.client_aliases enable row level security;
alter table public.branches enable row level security;
alter table public.branch_aliases enable row level security;
alter table public.operational_people enable row level security;
alter table public.operational_files enable row level security;
alter table public.file_status_events enable row level security;
alter table public.file_assignments enable row level security;
alter table public.file_notes enable row level security;
alter table public.file_documents enable row level security;
alter table public.file_tags enable row level security;
alter table public.file_custom_field_facts enable row level security;
alter table public.canonical_field_lineage enable row level security;

revoke all on public.clients, public.client_aliases, public.branches, public.branch_aliases,
  public.operational_people, public.operational_files, public.file_status_events,
  public.file_assignments, public.file_notes, public.file_documents, public.file_tags,
  public.file_custom_field_facts, public.canonical_field_lineage
from public, anon, authenticated;

grant select, insert, update on public.clients, public.branches, public.operational_people,
  public.operational_files
to service_role;
grant select, insert on public.client_aliases, public.branch_aliases, public.file_status_events,
  public.file_assignments, public.file_notes, public.file_documents, public.file_tags,
  public.file_custom_field_facts, public.canonical_field_lineage
to service_role;

create trigger file_status_events_immutable
before update or delete on public.file_status_events
for each row execute function public.prevent_immutable_source_mutation();
create trigger file_notes_immutable
before update or delete on public.file_notes
for each row execute function public.prevent_immutable_source_mutation();
create trigger file_documents_immutable
before update or delete on public.file_documents
for each row execute function public.prevent_immutable_source_mutation();
create trigger canonical_field_lineage_immutable
before update or delete on public.canonical_field_lineage
for each row execute function public.prevent_immutable_source_mutation();

comment on table public.operational_files is
  'Generalized C3 canonical file projection. legacy_claim_id provides an additive bridge to the validated C1 Monday claim model.';
comment on table public.canonical_field_lineage is
  'Field-level source evidence for canonical facts; derived KPI lineage is stored separately by the analytics layer.';
