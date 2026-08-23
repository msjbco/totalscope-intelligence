-- Governed TotalScope company/client master foundation. Additive and internal-only.
alter table public.clients
  add column source_status_code text,
  add column lifecycle_status text not null default 'unknown'
    check (lifecycle_status in ('current','inactive','unknown')),
  add column company_email text,
  add column company_phone text,
  add column source_created_at timestamptz,
  add column restricted_master_data boolean not null default false;

alter table public.branches
  add column location_precision text not null default 'unknown'
    check (location_precision in ('rooftop','parcel','interpolated_address','street','zip','city','unknown')),
  add column geocoding_status text not null default 'not_configured'
    check (geocoding_status in ('matched','ambiguous','not_found','not_configured','provider_error')),
  add column geocoding_provider text,
  add column geocoded_at timestamptz,
  add column restricted_master_data boolean not null default false;

create table public.client_location_source_identities (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null,
  client_id uuid not null,
  source_system text not null,
  external_client_id text not null,
  external_address_id text not null,
  first_ingestion_run_id uuid not null references public.ingestion_runs(id),
  last_ingestion_run_id uuid not null references public.ingestion_runs(id),
  ingestion_record_id uuid not null references public.ingestion_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (branch_id, client_id) references public.branches(id, client_id),
  unique (source_system, external_client_id, external_address_id),
  unique (branch_id, source_system)
);

create table public.client_contact_relationships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  operational_person_id uuid not null references public.operational_people(id),
  source_system text not null,
  external_user_id text not null,
  role_code text,
  first_ingestion_run_id uuid not null references public.ingestion_runs(id),
  last_ingestion_run_id uuid not null references public.ingestion_runs(id),
  ingestion_record_id uuid not null references public.ingestion_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, source_system, external_user_id)
);

create index clients_master_normalized_name_idx on public.clients(normalized_name) where restricted_master_data;
create index clients_master_email_idx on public.clients(lower(company_email)) where restricted_master_data and company_email is not null;
create index clients_master_phone_idx on public.clients(company_phone) where restricted_master_data and company_phone is not null;
create index branches_master_address_idx on public.branches(state_code, postal_code, normalized_name) where restricted_master_data;
create index client_contact_relationships_person_idx on public.client_contact_relationships(operational_person_id);

alter table public.client_location_source_identities enable row level security;
alter table public.client_contact_relationships enable row level security;
revoke all on public.client_location_source_identities,public.client_contact_relationships from public,anon,authenticated;
grant select,insert,update on public.client_location_source_identities,public.client_contact_relationships to service_role;

create function public.preserve_first_ingestion_run()
returns trigger language plpgsql set search_path='' as $$
begin
  new.first_ingestion_run_id := old.first_ingestion_run_id;
  return new;
end $$;
revoke all on function public.preserve_first_ingestion_run() from public,anon,authenticated;
grant execute on function public.preserve_first_ingestion_run() to service_role;
create trigger client_location_identity_preserve_first before update on public.client_location_source_identities
for each row execute function public.preserve_first_ingestion_run();
create trigger client_contact_relationship_preserve_first before update on public.client_contact_relationships
for each row execute function public.preserve_first_ingestion_run();

-- Existing demo/fixture canonical rows remain visible to active staging users.
-- Real restricted master rows are visible only to TotalScope staging administrators.
drop policy if exists "active users read clients" on public.clients;
create policy "authorized users read permitted clients" on public.clients for select to authenticated
using ((select private.is_active_application_user()) and (not restricted_master_data or (select private.is_staging_admin())));
drop policy if exists "active users read branches" on public.branches;
create policy "authorized users read permitted branches" on public.branches for select to authenticated
using ((select private.is_active_application_user()) and (not restricted_master_data or (select private.is_staging_admin())));

grant select (id, stable_client_id, display_name, active, source_status_code, lifecycle_status, restricted_master_data)
on public.clients to authenticated;
grant select (id, client_id, stable_branch_id, display_name, active, street_address, city, state_code,
  postal_code, latitude, longitude, location_precision, geocoding_status, restricted_master_data)
on public.branches to authenticated;

comment on table public.client_location_source_identities is 'Composite source identity for client locations because address_id is not globally unique outside its source entity.';
comment on table public.client_contact_relationships is 'Service-role-only company/contact relationship; repeated contacts across companies are preserved rather than merged by company.';
comment on column public.clients.lifecycle_status is 'Governed current/inactive/unknown classification. Source codes remain separate and unknown until an approved mapping exists.';

-- Versioned internal location interface. It deliberately returns no contact data
-- and only emits governed current, active, successfully geocoded locations.
create function public.get_weather_internal_client_locations_v2()
returns table (
  client_id uuid, branch_id uuid, client_name text, branch_name text,
  latitude double precision, longitude double precision, city text,
  state_code text, postal_code text, location_precision text,
  lifecycle_status text, geocoding_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staging_admin() then
    raise exception 'staging administrator role required' using errcode = '42501';
  end if;
  return query
  select c.id, b.id, c.display_name, b.display_name, b.latitude, b.longitude,
    b.city, b.state_code, b.postal_code, b.location_precision,
    c.lifecycle_status, b.geocoding_status
  from public.branches b
  join public.clients c on c.id = b.client_id
  where c.active and c.lifecycle_status = 'current' and b.active
    and b.geocoding_status = 'matched'
    and b.latitude is not null and b.longitude is not null;
end;
$$;

revoke all on function public.get_weather_internal_client_locations_v2() from public, anon;
grant execute on function public.get_weather_internal_client_locations_v2() to authenticated;
comment on function public.get_weather_internal_client_locations_v2() is 'Internal admin-only, contact-free client geography used for Weather exposure evaluation.';
