-- Controlled staging persistence for official NWS geometry and governed trial decisions.
create table public.client_location_geocode_dispositions (
  id uuid primary key default gen_random_uuid(),
  geocode_attempt_id uuid not null,
  branch_id uuid not null,
  client_id uuid not null,
  disposition text not null check (disposition in (
    'accepted_governed_coordinate','unresolved_coordinate','source_verification_required',
    'administrative_data_review','source_data_correction_required','rejected_po_box'
  )),
  rationale text not null,
  decision_source text not null,
  decided_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (geocode_attempt_id,branch_id,client_id)
    references public.client_location_geocode_attempts(id,branch_id,client_id),
  unique (geocode_attempt_id)
);

create trigger client_location_geocode_dispositions_immutable
before update or delete on public.client_location_geocode_dispositions
for each row execute function public.prevent_immutable_source_mutation();
alter table public.client_location_geocode_dispositions enable row level security;
revoke all on public.client_location_geocode_dispositions from public,anon,authenticated;
grant select,insert on public.client_location_geocode_dispositions to service_role;
grant select on public.client_location_geocode_dispositions to authenticated;
create policy "staging admins read geocode dispositions"
on public.client_location_geocode_dispositions for select to authenticated
using ((select private.is_staging_admin()));

alter table public.weather_client_exposures
  drop constraint weather_client_exposures_exposure_status_check;
alter table public.weather_client_exposures
  add constraint weather_client_exposures_exposure_status_check
  check (exposure_status in ('direct','near','outside','unknown'));

create function public.set_weather_event_governed_geometry(p_event_id uuid,p_geometry jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_geometry extensions.geometry;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if p_geometry is null or p_geometry='null'::jsonb then
    update public.weather_events set geography=null where id=p_event_id;
    return;
  end if;
  if p_geometry->>'type' not in ('Polygon','MultiPolygon') then
    raise exception 'only Polygon and MultiPolygon weather geometry is governed' using errcode='22023';
  end if;
  v_geometry:=extensions.ST_MakeValid(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(p_geometry),4326));
  if extensions.ST_IsEmpty(v_geometry) or not extensions.ST_IsValid(v_geometry) then
    raise exception 'weather geometry is empty or invalid' using errcode='22023';
  end if;
  update public.weather_events set geography=v_geometry::extensions.geography where id=p_event_id;
  if not found then raise exception 'weather event not found' using errcode='P0002'; end if;
end $$;
revoke all on function public.set_weather_event_governed_geometry(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.set_weather_event_governed_geometry(uuid,jsonb) to service_role;

create function public.refresh_weather_client_exposures(p_near_radius_km double precision default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if p_near_radius_km<=0 or p_near_radius_km>250 then raise exception 'near radius outside governed bounds' using errcode='22023'; end if;
  insert into public.weather_client_exposures (
    weather_opportunity_id,client_id,branch_id,exposure_status,distance_km,methodology,evaluated_at
  )
  select o.id,c.id,b.id,
    case when e.geography is null then 'unknown'
      when extensions.ST_Intersects(e.geography,extensions.ST_SetSRID(extensions.ST_MakePoint(b.longitude,b.latitude),4326)::extensions.geography) then 'direct'
      when extensions.ST_DWithin(e.geography,extensions.ST_SetSRID(extensions.ST_MakePoint(b.longitude,b.latitude),4326)::extensions.geography,p_near_radius_km*1000) then 'near'
      else 'outside' end,
    case when e.geography is null then null else round((extensions.ST_Distance(e.geography,extensions.ST_SetSRID(extensions.ST_MakePoint(b.longitude,b.latitude),4326)::extensions.geography)/1000)::numeric,3) end,
    case when e.geography is null then 'Official event has no governed Polygon/MultiPolygon geometry'
      when extensions.ST_Intersects(e.geography,extensions.ST_SetSRID(extensions.ST_MakePoint(b.longitude,b.latitude),4326)::extensions.geography) then 'Accepted branch point intersects official NWS event geometry'
      when extensions.ST_DWithin(e.geography,extensions.ST_SetSRID(extensions.ST_MakePoint(b.longitude,b.latitude),4326)::extensions.geography,p_near_radius_km*1000) then 'Accepted branch point is within the governed 50 km review radius'
      else 'Accepted branch point is outside the governed 50 km review radius' end,
    now()
  from public.weather_opportunities o
  join public.weather_events e on e.id=o.weather_event_id
  cross join public.branches b
  join public.clients c on c.id=b.client_id
  where e.provider_status='Actual' and e.expires_at>now()
    and c.active and c.lifecycle_status='current' and b.active
    and b.accepted_geocode_attempt_id is not null
    and b.location_precision in ('rooftop','parcel','interpolated_address')
    and b.latitude is not null and b.longitude is not null
  on conflict (weather_opportunity_id,client_id,branch_id) do update set
    exposure_status=excluded.exposure_status,distance_km=excluded.distance_km,
    methodology=excluded.methodology,evaluated_at=excluded.evaluated_at;
  select jsonb_build_object(
    'direct',count(*) filter(where exposure_status='direct'),
    'near',count(*) filter(where exposure_status='near'),
    'outside',count(*) filter(where exposure_status='outside'),
    'unknown',count(*) filter(where exposure_status='unknown')
  ) into v_result
  from public.weather_client_exposures x
  join public.weather_opportunities o on o.id=x.weather_opportunity_id
  join public.weather_events e on e.id=o.weather_event_id
  where e.provider_status='Actual' and e.expires_at>now();
  return v_result;
end $$;
revoke all on function public.refresh_weather_client_exposures(double precision) from public,anon,authenticated;
grant execute on function public.refresh_weather_client_exposures(double precision) to service_role;

comment on table public.client_location_geocode_dispositions is 'Immutable administrator disposition of governed geocoding evidence; source and provider evidence remain unchanged.';
comment on function public.refresh_weather_client_exposures(double precision) is 'Service-only PostGIS evaluation joining accepted current-client points to the same governed NWS geometry used for ZCTA intersection.';
