-- Immutable, internal geocoding governance for the controlled staging trial.
create table public.client_location_geocode_attempts (
  id uuid primary key default gen_random_uuid(), client_id uuid not null, branch_id uuid not null,
  address_fingerprint text not null check (address_fingerprint ~ '^[0-9a-f]{64}$'),
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  provider text not null check (provider in ('geocodio')), provider_version text not null,
  provider_result_id text, returned_formatted_address text, returned_city text, returned_state_code text, returned_postal_code text,
  latitude double precision, longitude double precision,
  location extensions.geography(Point,4326) generated always as (case when latitude is null or longitude is null then null else extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography end) stored,
  provider_precision text, canonical_precision text not null check (canonical_precision in ('rooftop','parcel','interpolated_address','street','zip','city','county','state','unknown')),
  confidence numeric(6,5), match_type text, component_match_metadata jsonb not null default '{}'::jsonb,
  state_matches boolean, postal_code_matches boolean,
  result_status text not null check (result_status in ('matched','ambiguous','not_found','provider_error')),
  review_status text not null check (review_status in ('auto_accepted','review_required','rejected')), review_reason text not null,
  raw_provider_payload jsonb not null default '{}'::jsonb, source_provenance jsonb not null default '{}'::jsonb,
  attempted_at timestamptz not null default now(), created_at timestamptz not null default now(),
  foreign key (branch_id,client_id) references public.branches(id,client_id),
  unique (provider,request_fingerprint), unique (id,branch_id,client_id)
);
create table public.client_geocoding_trial_samples (
  id uuid primary key default gen_random_uuid(), trial_version text not null, sample_reference text not null,
  sample_ordinal integer not null check(sample_ordinal between 1 and 50), sampling_category text not null,
  branch_id uuid not null, client_id uuid not null, address_fingerprint text not null,
  created_at timestamptz not null default now(), foreign key(branch_id,client_id) references public.branches(id,client_id),
  unique(trial_version,sample_reference), unique(trial_version,branch_id)
);
alter table public.branches add column accepted_geocode_attempt_id uuid;
alter table public.branches add constraint branches_accepted_geocode_attempt_owner_fk
  foreign key (accepted_geocode_attempt_id,id,client_id) references public.client_location_geocode_attempts(id,branch_id,client_id);
create index client_geocode_attempt_location_idx on public.client_location_geocode_attempts(branch_id,attempted_at desc);
create index client_geocode_attempt_geography_idx on public.client_location_geocode_attempts using gist(location);
create trigger client_location_geocode_attempts_immutable before update or delete on public.client_location_geocode_attempts
for each row execute function public.prevent_immutable_source_mutation();
alter table public.client_location_geocode_attempts enable row level security;
alter table public.client_geocoding_trial_samples enable row level security;
revoke all on public.client_location_geocode_attempts,public.client_geocoding_trial_samples from public,anon,authenticated;
grant select,insert on public.client_location_geocode_attempts,public.client_geocoding_trial_samples to service_role;
create policy "staging admins read geocode attempts" on public.client_location_geocode_attempts for select to authenticated using ((select private.is_staging_admin()));
create policy "staging admins read geocode trial sample" on public.client_geocoding_trial_samples for select to authenticated using ((select private.is_staging_admin()));
grant select on public.client_location_geocode_attempts,public.client_geocoding_trial_samples to authenticated;
comment on table public.client_location_geocode_attempts is 'Immutable internal provider evidence. Raw payload is restricted to service-role and staging administrators.';
