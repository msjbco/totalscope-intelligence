-- TotalScope Intelligence Weather Intelligence Beta.
-- Additive, internal-only, provenance-first weather and contractor intelligence.

create extension if not exists postgis with schema extensions;

alter table public.branches
  add column street_address text,
  add column city text,
  add column state_code text check (state_code is null or state_code ~ '^[A-Z]{2}$'),
  add column postal_code text,
  add column latitude double precision check (latitude is null or latitude between -90 and 90),
  add column longitude double precision check (longitude is null or longitude between -180 and 180),
  add column geography_quality text not null default 'not_captured'
    check (geography_quality in ('captured','partially_captured','not_captured','invalid'));

alter table public.clients add constraint clients_id_id_unique unique (id);
alter table public.branches add constraint branches_id_client_id_unique unique (id, client_id);

create table public.weather_sources (
  id text primary key,
  display_name text not null,
  authority text not null,
  source_url text not null,
  expected_refresh_seconds integer not null check (expected_refresh_seconds >= 30),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.weather_provider_refreshes (
  id uuid primary key default gen_random_uuid(),
  weather_source_id text not null references public.weather_sources(id),
  operation text not null,
  attempted_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('running','succeeded','partial','failed')),
  records_returned integer check (records_returned is null or records_returned >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_classification text,
  sanitized_error text,
  ingestion_run_id uuid references public.ingestion_runs(id),
  created_at timestamptz not null default now()
);

create table public.weather_events (
  id uuid primary key default gen_random_uuid(),
  weather_source_id text not null references public.weather_sources(id),
  provider_event_id text not null,
  lifecycle_status text not null check (lifecycle_status in ('forecast','watch','warning','advisory','statement','radar_observed','preliminary_report','confirmed_history')),
  event_name text not null,
  provider_status text not null,
  message_type text not null,
  severity text,
  certainty text,
  urgency text,
  headline text,
  area_description text,
  sent_at timestamptz not null,
  effective_at timestamptz not null,
  onset_at timestamptz,
  expires_at timestamptz not null,
  ends_at timestamptz,
  geometry_json jsonb,
  geography extensions.geography(Geometry, 4326),
  source_url text not null,
  source_observed_at timestamptz not null,
  retrieved_at timestamptz not null,
  latest_revision_sha256 text not null check (latest_revision_sha256 ~ '^[0-9a-f]{64}$'),
  first_ingestion_record_id uuid not null references public.ingestion_records(id),
  latest_ingestion_record_id uuid not null references public.ingestion_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at >= effective_at),
  unique (weather_source_id, provider_event_id)
);

create table public.weather_event_revisions (
  id uuid primary key default gen_random_uuid(),
  weather_event_id uuid not null references public.weather_events(id),
  ingestion_record_id uuid not null references public.ingestion_records(id),
  revision_sha256 text not null check (revision_sha256 ~ '^[0-9a-f]{64}$'),
  normalized_payload jsonb not null,
  source_observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (weather_event_id, revision_sha256)
);

create table public.weather_forecasts (
  id uuid primary key default gen_random_uuid(),
  weather_source_id text not null references public.weather_sources(id),
  monitored_location_id text not null,
  provider_forecast_id text not null,
  forecast_type text not null check (forecast_type in ('period','hourly')),
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  source_observed_at timestamptz not null,
  retrieved_at timestamptz not null,
  normalized_payload jsonb not null,
  ingestion_record_id uuid not null references public.ingestion_records(id),
  check (valid_to > valid_from),
  unique (weather_source_id, monitored_location_id, provider_forecast_id, valid_from)
);

create table public.weather_opportunities (
  id uuid primary key default gen_random_uuid(),
  weather_event_id uuid not null unique references public.weather_events(id),
  classification text not null check (classification in ('monitor','elevated','high','active')),
  classifier_version text not null,
  rationale jsonb not null,
  classified_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.weather_client_exposures (
  id uuid primary key default gen_random_uuid(),
  weather_opportunity_id uuid not null references public.weather_opportunities(id),
  client_id uuid not null references public.clients(id),
  branch_id uuid not null,
  exposure_status text not null check (exposure_status in ('direct','near','unknown')),
  distance_km numeric(10,3) check (distance_km is null or distance_km >= 0),
  methodology text not null,
  evaluated_at timestamptz not null,
  foreign key (branch_id, client_id) references public.branches(id, client_id),
  unique (weather_opportunity_id, client_id, branch_id)
);

create table public.contractor_discovery_sources (
  id text primary key,
  display_name text not null,
  license_reference text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.contractor_prospects (
  id uuid primary key default gen_random_uuid(),
  contractor_discovery_source_id text not null references public.contractor_discovery_sources(id),
  provider_business_id text not null,
  business_name text not null,
  normalized_name text not null,
  street_address text,
  city text,
  state_code text check (state_code is null or state_code ~ '^[A-Z]{2}$'),
  postal_code text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  location extensions.geography(Point, 4326),
  phone text,
  email text,
  website text,
  contact_name text,
  business_category text,
  source_reference text,
  retrieved_at timestamptz not null,
  last_refreshed_at timestamptz not null,
  completeness text not null check (completeness in ('complete','partial','minimal')),
  unique (contractor_discovery_source_id, provider_business_id)
);

create table public.weather_opportunity_prospects (
  id uuid primary key default gen_random_uuid(),
  weather_opportunity_id uuid not null references public.weather_opportunities(id),
  contractor_prospect_id uuid not null references public.contractor_prospects(id),
  radius_km numeric(8,3) not null default 50 check (radius_km > 0 and radius_km <= 500),
  distance_from_geometry_km numeric(10,3) not null check (distance_from_geometry_km >= 0),
  match_status text not null check (match_status in ('not_existing_client','possible_existing_client','confirmed_existing_client')),
  match_rationale jsonb not null,
  matched_client_id uuid,
  matched_branch_id uuid,
  evaluated_at timestamptz not null,
  foreign key (matched_branch_id, matched_client_id) references public.branches(id, client_id),
  check ((matched_client_id is null) = (matched_branch_id is null)),
  unique (weather_opportunity_id, contractor_prospect_id)
);

create index weather_events_active_idx on public.weather_events(expires_at, effective_at desc) where provider_status = 'Actual';
create index weather_events_geography_idx on public.weather_events using gist(geography);
create index weather_forecasts_window_idx on public.weather_forecasts(monitored_location_id, valid_from, valid_to);
create index weather_refreshes_source_idx on public.weather_provider_refreshes(weather_source_id, attempted_at desc);
create index contractor_prospects_location_idx on public.contractor_prospects using gist(location);
create index weather_opportunity_prospects_distance_idx on public.weather_opportunity_prospects(weather_opportunity_id, distance_from_geometry_km);

create trigger weather_event_revisions_immutable before update or delete on public.weather_event_revisions for each row execute function public.prevent_immutable_source_mutation();
create trigger weather_forecasts_immutable before update or delete on public.weather_forecasts for each row execute function public.prevent_immutable_source_mutation();

alter table public.weather_sources enable row level security;
alter table public.weather_provider_refreshes enable row level security;
alter table public.weather_events enable row level security;
alter table public.weather_event_revisions enable row level security;
alter table public.weather_forecasts enable row level security;
alter table public.weather_opportunities enable row level security;
alter table public.weather_client_exposures enable row level security;
alter table public.contractor_discovery_sources enable row level security;
alter table public.contractor_prospects enable row level security;
alter table public.weather_opportunity_prospects enable row level security;

revoke all on public.weather_sources, public.weather_provider_refreshes, public.weather_events,
  public.weather_event_revisions, public.weather_forecasts, public.weather_opportunities,
  public.weather_client_exposures, public.contractor_discovery_sources,
  public.contractor_prospects, public.weather_opportunity_prospects
from public, anon, authenticated;

grant select, insert, update on public.weather_sources, public.weather_provider_refreshes,
  public.weather_events, public.weather_opportunities, public.weather_client_exposures,
  public.contractor_discovery_sources, public.contractor_prospects,
  public.weather_opportunity_prospects to service_role;
grant select, insert on public.weather_event_revisions, public.weather_forecasts to service_role;

create policy "staging admins read weather events" on public.weather_events for select to authenticated using ((select private.is_staging_admin()));
create policy "staging admins read weather forecasts" on public.weather_forecasts for select to authenticated using ((select private.is_staging_admin()));
create policy "staging admins read weather opportunities" on public.weather_opportunities for select to authenticated using ((select private.is_staging_admin()));
create policy "staging admins read weather client exposures" on public.weather_client_exposures for select to authenticated using ((select private.is_staging_admin()));
create policy "staging admins read contractor prospects" on public.contractor_prospects for select to authenticated using ((select private.is_staging_admin()));
create policy "staging admins read opportunity prospects" on public.weather_opportunity_prospects for select to authenticated using ((select private.is_staging_admin()));
create policy "staging admins read weather refresh health" on public.weather_provider_refreshes for select to authenticated using ((select private.is_staging_admin()));

grant select (id, provider_event_id, lifecycle_status, event_name, severity, certainty, urgency, headline, area_description, effective_at, onset_at, expires_at, geometry_json, source_observed_at, retrieved_at, source_url) on public.weather_events to authenticated;
-- PostgreSQL security-invoker views require the invoker to hold relation-level
-- SELECT on the underlying table. Admin-only RLS remains the row boundary;
-- immutable raw revisions remain ungranted and service-role-only.
grant select on public.weather_events to authenticated;
grant select (id, weather_source_id, monitored_location_id, forecast_type, valid_from, valid_to, source_observed_at, retrieved_at, normalized_payload) on public.weather_forecasts to authenticated;
grant select on public.weather_opportunities, public.weather_client_exposures, public.weather_opportunity_prospects to authenticated;
grant select (id, contractor_discovery_source_id, provider_business_id, business_name, street_address, city, state_code, postal_code, latitude, longitude, phone, email, website, contact_name, business_category, source_reference, retrieved_at, last_refreshed_at, completeness) on public.contractor_prospects to authenticated;
grant select (id, weather_source_id, operation, attempted_at, completed_at, status, records_returned, retry_count, latency_ms, error_classification, sanitized_error) on public.weather_provider_refreshes to authenticated;

create view public.weather_internal_active_alerts with (security_invoker = true) as
select id, provider_event_id, lifecycle_status, event_name, severity, certainty, urgency,
  headline, area_description, effective_at, onset_at, expires_at, geometry_json,
  source_observed_at, retrieved_at, source_url
from public.weather_events
where provider_status = 'Actual' and expires_at > now();

revoke all on public.weather_internal_active_alerts from public, anon;
grant select on public.weather_internal_active_alerts to authenticated;

create function public.get_weather_internal_branch_locations()
returns table (
  client_id uuid, branch_id uuid, client_name text, branch_name text,
  latitude double precision, longitude double precision, city text, state_code text, postal_code text
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
  select c.id, b.id, c.display_name, b.display_name, b.latitude, b.longitude, b.city, b.state_code, b.postal_code
  from public.branches b join public.clients c on c.id = b.client_id
  where c.active and b.active;
end;
$$;

revoke all on function public.get_weather_internal_branch_locations() from public, anon;
grant execute on function public.get_weather_internal_branch_locations() to authenticated;

revoke insert, update, delete, truncate, references, trigger
on public.weather_sources, public.weather_provider_refreshes, public.weather_events,
  public.weather_event_revisions, public.weather_forecasts, public.weather_opportunities,
  public.weather_client_exposures, public.contractor_discovery_sources,
  public.contractor_prospects, public.weather_opportunity_prospects
from anon, authenticated;

comment on table public.weather_events is 'Canonical official weather records with GeoJSON, PostGIS geography, freshness, and immutable ingestion provenance. Alerts do not assert property damage.';
comment on table public.weather_client_exposures is 'Internal-only exposure evaluations with a composite foreign key proving branch ownership by client.';
comment on table public.weather_opportunity_prospects is 'Internal-only storm/prospect results; confirmed clients are retained for audit but excluded from default prospect presentation.';
comment on view public.weather_internal_active_alerts is 'Staging-admin-only, security-invoker alert surface. Ordinary viewers and anonymous roles have no row access.';
