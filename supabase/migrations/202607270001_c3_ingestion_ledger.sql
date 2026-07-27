-- TotalScope Intelligence C3: generalized, provenance-first ingestion ledger.
-- Additive only. Existing C1/C2 migrations and the Q2 importer remain unchanged.

create table public.source_contracts (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  dataset_type text not null,
  contract_version text not null,
  schema_sha256 text not null check (schema_sha256 ~ '^[0-9a-f]{64}$'),
  definition jsonb not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  approval_status text not null check (approval_status in ('draft','approved','retired')),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from),
  check (
    (approval_status = 'approved' and approved_at is not null)
    or approval_status <> 'approved'
  ),
  unique (source_system, dataset_type, contract_version)
);

create table public.source_artifacts (
  id uuid primary key default gen_random_uuid(),
  source_contract_id uuid not null references public.source_contracts(id),
  source_system text not null,
  artifact_type text not null,
  filename text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size bigint not null check (byte_size >= 0),
  covered_from timestamptz,
  covered_to timestamptz,
  received_at timestamptz not null,
  protected_storage_pointer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (covered_to is null or covered_from is null or covered_to >= covered_from),
  unique (source_system, sha256)
);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  dataset_type text not null,
  ingestion_mode text not null check (ingestion_mode in ('full','incremental')),
  covered_from timestamptz,
  covered_to timestamptz,
  source_watermark text,
  artifact_set_fingerprint text not null check (artifact_set_fingerprint ~ '^[0-9a-f]{64}$'),
  parser_version text not null,
  mapping_version text not null,
  status public.import_status not null default 'pending'::public.import_status,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  execution_actor text,
  source_record_count bigint not null default 0 check (source_record_count >= 0),
  accepted_record_count bigint not null default 0 check (accepted_record_count >= 0),
  quarantined_record_count bigint not null default 0 check (quarantined_record_count >= 0),
  rejected_record_count bigint not null default 0 check (rejected_record_count >= 0),
  warning_count bigint not null default 0 check (warning_count >= 0),
  error_count bigint not null default 0 check (error_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (covered_to is null or covered_from is null or covered_to >= covered_from),
  check (completed_at is null or completed_at >= started_at),
  unique (source_system, dataset_type, artifact_set_fingerprint, parser_version, mapping_version)
);

create table public.ingestion_run_artifacts (
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  source_artifact_id uuid not null references public.source_artifacts(id),
  logical_table text not null,
  artifact_sequence integer not null check (artifact_sequence >= 0),
  created_at timestamptz not null default now(),
  primary key (ingestion_run_id, source_artifact_id),
  unique (ingestion_run_id, logical_table, artifact_sequence)
);

create table public.ingestion_run_steps (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  step_name text not null,
  batch_sequence integer not null check (batch_sequence >= 0),
  retry_number integer not null default 0 check (retry_number >= 0),
  status public.import_status not null default 'pending'::public.import_status,
  input_count bigint not null default 0 check (input_count >= 0),
  output_count bigint not null default 0 check (output_count >= 0),
  warning_count bigint not null default 0 check (warning_count >= 0),
  error_count bigint not null default 0 check (error_count >= 0),
  error_code text,
  sanitized_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  check (completed_at is null or completed_at >= started_at),
  unique (ingestion_run_id, step_name, batch_sequence, retry_number)
);

create table public.ingestion_records (
  id uuid primary key default gen_random_uuid(),
  source_artifact_id uuid not null references public.source_artifacts(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  logical_table text not null,
  source_locator text not null,
  stable_source_key text,
  raw_payload jsonb,
  protected_payload_pointer text,
  row_sha256 text not null check (row_sha256 ~ '^[0-9a-f]{64}$'),
  source_observed_at timestamptz,
  source_timezone text,
  source_timezone_status public.timezone_status not null default 'unknown_timezone'::public.timezone_status,
  parsing_status text not null check (parsing_status in ('received','parsed','warning','invalid','quarantined','rejected')),
  parsing_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (raw_payload is not null or protected_payload_pointer is not null),
  unique (source_artifact_id, logical_table, source_locator)
);

create table public.normalization_attempts (
  id uuid primary key default gen_random_uuid(),
  ingestion_record_id uuid not null references public.ingestion_records(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  mapping_version text not null,
  attempt_number integer not null default 1 check (attempt_number > 0),
  normalized_payload jsonb,
  outcome text not null check (outcome in ('accepted','quarantined','rejected','failed')),
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  attempted_at timestamptz not null default now(),
  unique (ingestion_record_id, mapping_version, attempt_number)
);

create table public.ingestion_issues (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  ingestion_record_id uuid references public.ingestion_records(id),
  deterministic_key text not null,
  issue_type text not null,
  severity text not null check (severity in ('info','warning','error','critical')),
  status public.review_status not null default 'pending'::public.review_status,
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  suggested_action text,
  assigned_reviewer uuid,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (ingestion_run_id, deterministic_key)
);

create index source_contracts_effective_idx
  on public.source_contracts(source_system, dataset_type, approval_status, effective_from desc);
create index source_artifacts_period_idx
  on public.source_artifacts(source_system, covered_from, covered_to);
create index ingestion_runs_status_started_idx
  on public.ingestion_runs(status, started_at desc);
create index ingestion_run_steps_status_idx
  on public.ingestion_run_steps(ingestion_run_id, status, step_name, batch_sequence);
create index ingestion_records_source_key_idx
  on public.ingestion_records(logical_table, stable_source_key)
  where stable_source_key is not null;
create index ingestion_records_run_table_idx
  on public.ingestion_records(ingestion_run_id, logical_table);
create index normalization_attempts_run_outcome_idx
  on public.normalization_attempts(ingestion_run_id, outcome);
create index ingestion_issues_queue_idx
  on public.ingestion_issues(status, severity, issue_type, created_at);

alter table public.source_contracts enable row level security;
alter table public.source_artifacts enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.ingestion_run_artifacts enable row level security;
alter table public.ingestion_run_steps enable row level security;
alter table public.ingestion_records enable row level security;
alter table public.normalization_attempts enable row level security;
alter table public.ingestion_issues enable row level security;

revoke all on public.source_contracts, public.source_artifacts, public.ingestion_runs,
  public.ingestion_run_artifacts, public.ingestion_run_steps, public.ingestion_records,
  public.normalization_attempts, public.ingestion_issues
from public, anon, authenticated;

grant select, insert, update on public.source_contracts, public.ingestion_runs,
  public.ingestion_run_steps, public.ingestion_issues
to service_role;
grant select, insert on public.source_artifacts, public.ingestion_run_artifacts,
  public.ingestion_records, public.normalization_attempts
to service_role;

create trigger source_artifacts_immutable
before update or delete on public.source_artifacts
for each row execute function public.prevent_immutable_source_mutation();

create trigger ingestion_records_immutable
before update or delete on public.ingestion_records
for each row execute function public.prevent_immutable_source_mutation();

create trigger normalization_attempts_immutable
before update or delete on public.normalization_attempts
for each row execute function public.prevent_immutable_source_mutation();

comment on table public.ingestion_runs is
  'Generalized full/incremental import history. Existing C1 import_jobs remain the authority for the validated Q2 importer.';
comment on table public.ingestion_records is
  'Immutable source records with either an in-database raw payload or a protected external payload pointer.';
comment on table public.normalization_attempts is
  'Append-only versioned normalization outcomes; source records are never overwritten.';
