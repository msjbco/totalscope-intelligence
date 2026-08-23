-- TotalScope Intelligence Weather Intelligence Beta.
-- Governed 2025 Census TIGER/Line ZCTA geography and internal-only intersection.

create table public.zcta_dataset_versions (
  version text primary key,
  source_name text not null,
  source_url text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_crs text not null,
  storage_crs text not null default 'EPSG:4326',
  expected_record_count integer not null check (expected_record_count > 0),
  imported_record_count integer not null default 0 check (imported_record_count >= 0),
  status text not null check (status in ('loading','active','superseded','failed')),
  imported_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.zcta_geographies (
  dataset_version text not null references public.zcta_dataset_versions(version) on delete cascade,
  zcta5 text not null check (zcta5 ~ '^[0-9]{5}$'),
  geometry extensions.geometry(MultiPolygon, 4326) not null,
  land_area_square_meters bigint check (land_area_square_meters is null or land_area_square_meters >= 0),
  water_area_square_meters bigint check (water_area_square_meters is null or water_area_square_meters >= 0),
  imported_at timestamptz not null default now(),
  primary key (dataset_version, zcta5),
  check (not extensions.ST_IsEmpty(geometry)),
  check (extensions.ST_IsValid(geometry))
);

create unique index zcta_one_active_dataset_idx on public.zcta_dataset_versions(status) where status = 'active';
create index zcta_geographies_geometry_idx on public.zcta_geographies using gist(geometry);

alter table public.zcta_dataset_versions enable row level security;
alter table public.zcta_geographies enable row level security;

revoke all on public.zcta_dataset_versions, public.zcta_geographies from public, anon, authenticated;
grant select, insert, update, delete on public.zcta_dataset_versions, public.zcta_geographies to service_role;
revoke insert, update, delete, truncate, references, trigger on public.zcta_dataset_versions, public.zcta_geographies from anon, authenticated;

create function public.import_zcta_geography_batch(
  p_version text,
  p_source_name text,
  p_source_url text,
  p_source_sha256 text,
  p_source_crs text,
  p_expected_record_count integer,
  p_features jsonb default '[]'::jsonb,
  p_finalize boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_version !~ '^[0-9]{4}-tiger-line-zcta520$'
     or p_source_sha256 !~ '^[0-9a-f]{64}$'
     or p_expected_record_count <= 0 then
    raise exception 'invalid governed ZCTA import metadata' using errcode = '22023';
  end if;

  insert into public.zcta_dataset_versions (
    version, source_name, source_url, source_sha256, source_crs,
    expected_record_count, status
  ) values (
    p_version, p_source_name, p_source_url, p_source_sha256, p_source_crs,
    p_expected_record_count, 'loading'
  )
  on conflict (version) do update set
    source_name = excluded.source_name,
    source_url = excluded.source_url,
    source_crs = excluded.source_crs,
    expected_record_count = excluded.expected_record_count
  where public.zcta_dataset_versions.source_sha256 = excluded.source_sha256
    and public.zcta_dataset_versions.status in ('loading','failed');

  if not exists (
    select 1 from public.zcta_dataset_versions
    where version = p_version and source_sha256 = p_source_sha256
  ) then
    raise exception 'version already exists with a different source fingerprint' using errcode = '23505';
  end if;

  insert into public.zcta_geographies (
    dataset_version, zcta5, geometry, land_area_square_meters, water_area_square_meters
  )
  select
    p_version,
    feature->>'zcta5',
    extensions.ST_Multi(
      extensions.ST_CollectionExtract(
        extensions.ST_MakeValid(
          extensions.ST_Transform(
            extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(feature->'geometry'), 4269),
            4326
          )
        ), 3
      )
    )::extensions.geometry(MultiPolygon, 4326),
    nullif(feature->>'land_area_square_meters','')::bigint,
    nullif(feature->>'water_area_square_meters','')::bigint
  from jsonb_array_elements(coalesce(p_features, '[]'::jsonb)) feature
  on conflict (dataset_version, zcta5) do update set
    geometry = excluded.geometry,
    land_area_square_meters = excluded.land_area_square_meters,
    water_area_square_meters = excluded.water_area_square_meters,
    imported_at = now();

  select count(*) into v_count from public.zcta_geographies where dataset_version = p_version;
  update public.zcta_dataset_versions set imported_record_count = v_count where version = p_version;

  if p_finalize then
    if v_count <> p_expected_record_count then
      update public.zcta_dataset_versions set status = 'failed' where version = p_version;
      raise exception 'ZCTA count gate failed: expected %, found %', p_expected_record_count, v_count using errcode = '23514';
    end if;
    update public.zcta_dataset_versions set status = 'superseded' where status = 'active' and version <> p_version;
    update public.zcta_dataset_versions set status = 'active', imported_at = now() where version = p_version;
  end if;

  return jsonb_build_object('version', p_version, 'record_count', v_count, 'finalized', p_finalize);
end;
$$;

revoke all on function public.import_zcta_geography_batch(text,text,text,text,text,integer,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.import_zcta_geography_batch(text,text,text,text,text,integer,jsonb,boolean) to service_role;

create function public.get_weather_affected_zctas(
  p_alerts jsonb,
  p_minimum_area_square_meters double precision default 10000,
  p_minimum_zcta_fraction double precision default 0.0001
)
returns table (source_id text, available boolean, zctas text[], methodology text, dataset_version text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_version text;
begin
  if not private.is_staging_admin() then
    raise exception 'staging administrator role required' using errcode = '42501';
  end if;
  if p_minimum_area_square_meters < 0 or p_minimum_zcta_fraction < 0 or p_minimum_zcta_fraction > 1 then
    raise exception 'invalid ZCTA intersection threshold' using errcode = '22023';
  end if;
  select version into v_version from public.zcta_dataset_versions where status = 'active';

  return query
  with alerts as (
    select item->>'source_id' as alert_source_id,
      case when item->'geometry' is null or item->'geometry' = 'null'::jsonb then null
        else extensions.ST_MakeValid(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(item->'geometry'), 4326))
      end as alert_geometry
    from jsonb_array_elements(coalesce(p_alerts, '[]'::jsonb)) item
  )
  select a.alert_source_id,
    v_version is not null and a.alert_geometry is not null,
    coalesce(array_agg(z.zcta5 order by z.zcta5) filter (where z.zcta5 is not null), '{}'::text[]),
    case
      when v_version is null then 'Governed Census ZCTA geography is not loaded.'
      when a.alert_geometry is null then 'Unable to determine affected ZIP areas from available storm geometry.'
      else 'Material intersection with governed Census ZCTA geography; USPS ZIP Codes and Census ZCTAs are not identical.'
    end,
    v_version
  from alerts a
  left join public.zcta_geographies z
    on z.dataset_version = v_version
   and a.alert_geometry is not null
   and z.geometry OPERATOR(extensions.&&) a.alert_geometry
   and extensions.ST_Intersects(z.geometry, a.alert_geometry)
   and extensions.ST_Area(extensions.ST_Intersection(z.geometry, a.alert_geometry)::extensions.geography)
       >= greatest(
         p_minimum_area_square_meters,
         extensions.ST_Area(z.geometry::extensions.geography) * p_minimum_zcta_fraction
       )
  group by a.alert_source_id, a.alert_geometry;
end;
$$;

revoke all on function public.get_weather_affected_zctas(jsonb,double precision,double precision) from public, anon;
grant execute on function public.get_weather_affected_zctas(jsonb,double precision,double precision) to authenticated;

comment on table public.zcta_dataset_versions is 'Governed Census TIGER/Line ZCTA dataset versions; only a complete count-gated version becomes active.';
comment on table public.zcta_geographies is 'Authoritative Census ZCTA reference polygons. Public geography remains server-side and is not a browser geometry surface.';
comment on function public.get_weather_affected_zctas(jsonb,double precision,double precision) is 'Internal administrator-only material polygon-to-ZCTA intersection returning identifiers only.';
