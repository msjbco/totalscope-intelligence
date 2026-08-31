-- Governed NWS refresh coordination. The scheduler remains external to PostgreSQL;
-- this lease is the cross-process authority that prevents overlapping refreshes.
create table public.weather_refresh_leases (
  weather_source_id text primary key references public.weather_sources(id),
  lease_token uuid not null,
  holder text not null,
  acquired_at timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at > acquired_at)
);

alter table public.weather_refresh_leases enable row level security;
revoke all on public.weather_refresh_leases from public, anon, authenticated;
grant select, insert, update, delete on public.weather_refresh_leases to service_role;

create function public.acquire_weather_refresh_lease(
  p_weather_source_id text,
  p_lease_token uuid,
  p_holder text,
  p_lease_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 1800 then
    raise exception 'lease duration outside governed bounds' using errcode = '22023';
  end if;

  insert into public.weather_refresh_leases (
    weather_source_id, lease_token, holder, acquired_at, expires_at
  ) values (
    p_weather_source_id, p_lease_token, left(p_holder, 200), now(), now() + make_interval(secs => p_lease_seconds)
  )
  on conflict (weather_source_id) do update set
    lease_token = excluded.lease_token,
    holder = excluded.holder,
    acquired_at = excluded.acquired_at,
    expires_at = excluded.expires_at
  where public.weather_refresh_leases.expires_at <= now();

  return exists (
    select 1 from public.weather_refresh_leases
    where weather_source_id = p_weather_source_id and lease_token = p_lease_token
  );
end;
$$;

create function public.release_weather_refresh_lease(
  p_weather_source_id text,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_deleted integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  delete from public.weather_refresh_leases
  where weather_source_id = p_weather_source_id and lease_token = p_lease_token;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on function public.acquire_weather_refresh_lease(text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.release_weather_refresh_lease(text, uuid) from public, anon, authenticated;
grant execute on function public.acquire_weather_refresh_lease(text, uuid, text, integer) to service_role;
grant execute on function public.release_weather_refresh_lease(text, uuid) to service_role;

-- The existing administrator RPC remains administrator-only for browser sessions.
-- Service-role execution is added solely so the governed ingestion pipeline can run
-- the same material ZCTA intersection after persisting official geometry.
create or replace function public.get_weather_affected_zctas(
  p_alerts jsonb,
  p_minimum_area_square_meters double precision default 10000,
  p_minimum_zcta_fraction double precision default 0.0001
)
returns table(source_id text,available boolean,zctas text[],methodology text,dataset_version text)
language plpgsql stable security definer set search_path='' as $$
declare v_version text;
begin
  if auth.role() <> 'service_role' and not private.is_staging_admin() then
    raise exception 'staging administrator role required' using errcode='42501';
  end if;
  if p_minimum_area_square_meters<0 or p_minimum_zcta_fraction<0 or p_minimum_zcta_fraction>1 then raise exception 'invalid ZCTA intersection threshold' using errcode='22023'; end if;
  select version into v_version from public.zcta_dataset_versions where status='active';
  return query with alerts as (
    select item_ordinality alert_ordinality,item->>'source_id' alert_source_id,
      case when item->'geometry' is null or item->'geometry'='null'::jsonb then null
        else extensions.ST_MakeValid(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(item->'geometry'),4326)) end alert_geometry
    from jsonb_array_elements(coalesce(p_alerts,'[]'::jsonb)) with ordinality input(item,item_ordinality)
  ), discovery_parts as (
    select a.alert_ordinality,a.alert_geometry discovery_geometry from alerts a
    where a.alert_geometry is not null and extensions.ST_GeometryType(a.alert_geometry)<>'ST_MultiPolygon'
    union all
    select a.alert_ordinality,d.geom from alerts a cross join lateral extensions.ST_Dump(a.alert_geometry) d
    where extensions.ST_GeometryType(a.alert_geometry)='ST_MultiPolygon'
  ), candidate_ids as materialized (
    select distinct p.alert_ordinality,z.zcta5 from discovery_parts p join public.zcta_geographies z
      on z.dataset_version=v_version and z.geometry OPERATOR(extensions.&&) p.discovery_geometry
      and extensions.ST_Intersects(z.geometry,p.discovery_geometry)
  ), candidates as (
    select a.alert_ordinality,a.alert_source_id,a.alert_geometry,z.zcta5,z.geometry,z.geodesic_area_square_meters
    from candidate_ids ci join alerts a on a.alert_ordinality=ci.alert_ordinality
    join public.zcta_geographies z on z.dataset_version=v_version and z.zcta5=ci.zcta5
  ), matches as (
    select c.alert_ordinality,c.zcta5 from candidates c
    where extensions.ST_Area(extensions.ST_Intersection(c.geometry,c.alert_geometry)::extensions.geography)
      >=greatest(p_minimum_area_square_meters,c.geodesic_area_square_meters*p_minimum_zcta_fraction)
  )
  select a.alert_source_id,v_version is not null and a.alert_geometry is not null,
    coalesce(array_agg(m.zcta5 order by m.zcta5) filter(where m.zcta5 is not null),'{}'::text[]),
    case when v_version is null then 'Governed Census ZCTA geography is not loaded.' when a.alert_geometry is null then 'Unable to determine affected ZIP areas from available storm geometry.' else 'Material intersection with governed Census ZCTA geography; USPS ZIP Codes and Census ZCTAs are not identical.' end,
    v_version
  from alerts a left join matches m on m.alert_ordinality=a.alert_ordinality
  group by a.alert_ordinality,a.alert_source_id,a.alert_geometry;
end $$;

revoke all on function public.get_weather_affected_zctas(jsonb,double precision,double precision) from public,anon;
grant execute on function public.get_weather_affected_zctas(jsonb,double precision,double precision) to authenticated,service_role;

comment on table public.weather_refresh_leases is 'Service-only expiring distributed leases for governed provider refreshes.';
comment on function public.get_weather_affected_zctas(jsonb,double precision,double precision) is 'Internal administrator and governed service pipeline material polygon-to-ZCTA intersection; returns identifiers only.';
