-- Reduce candidate explosion for disjoint MultiPolygon inputs without changing
-- the authoritative material-intersection rule.
create or replace function public.get_weather_affected_zctas(
  p_alerts jsonb,
  p_minimum_area_square_meters double precision default 10000,
  p_minimum_zcta_fraction double precision default 0.0001
)
returns table(source_id text,available boolean,zctas text[],methodology text,dataset_version text)
language plpgsql stable security definer set search_path='' as $$
declare v_version text;
begin
  if not private.is_staging_admin() then raise exception 'staging administrator role required' using errcode='42501'; end if;
  if p_minimum_area_square_meters<0 or p_minimum_zcta_fraction<0 or p_minimum_zcta_fraction>1 then raise exception 'invalid ZCTA intersection threshold' using errcode='22023'; end if;
  select version into v_version from public.zcta_dataset_versions where status='active';

  return query with alerts as (
    select
      item_ordinality alert_ordinality,
      item->>'source_id' alert_source_id,
      case
        when item->'geometry' is null or item->'geometry'='null'::jsonb then null
        else extensions.ST_MakeValid(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(item->'geometry'),4326))
      end alert_geometry
    from jsonb_array_elements(coalesce(p_alerts,'[]'::jsonb)) with ordinality input(item,item_ordinality)
  ), discovery_parts as (
    select a.alert_ordinality,a.alert_geometry discovery_geometry
    from alerts a
    where a.alert_geometry is not null
      and extensions.ST_GeometryType(a.alert_geometry)<>'ST_MultiPolygon'
    union all
    select a.alert_ordinality,d.geom
    from alerts a
    cross join lateral extensions.ST_Dump(a.alert_geometry) d
    where extensions.ST_GeometryType(a.alert_geometry)='ST_MultiPolygon'
  ), candidate_ids as materialized (
    select distinct p.alert_ordinality,z.zcta5
    from discovery_parts p
    join public.zcta_geographies z
      on z.dataset_version=v_version
     and z.geometry OPERATOR(extensions.&&) p.discovery_geometry
     and extensions.ST_Intersects(z.geometry,p.discovery_geometry)
  ), candidates as (
    select a.alert_ordinality,a.alert_source_id,a.alert_geometry,z.zcta5,z.geometry,z.geodesic_area_square_meters
    from candidate_ids ci
    join alerts a on a.alert_ordinality=ci.alert_ordinality
    join public.zcta_geographies z on z.dataset_version=v_version and z.zcta5=ci.zcta5
  ), matches as (
    select c.alert_ordinality,c.zcta5
    from candidates c
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
grant execute on function public.get_weather_affected_zctas(jsonb,double precision,double precision) to authenticated;

comment on function public.get_weather_affected_zctas(jsonb,double precision,double precision)
  is 'Internal administrator-only material polygon-to-ZCTA intersection returning identifiers only; MultiPolygon components are decomposed only for indexed candidate discovery.';
