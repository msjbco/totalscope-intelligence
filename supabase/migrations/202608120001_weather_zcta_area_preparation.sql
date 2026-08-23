-- Lightweight preparation for bounded governed ZCTA geodesic-area backfill.
alter table public.zcta_geographies
  add column geodesic_area_square_meters double precision;
alter table public.zcta_geographies
  add constraint zcta_geographies_geodesic_area_positive
  check (geodesic_area_square_meters is null or geodesic_area_square_meters > 0)
  not valid;

create function private.set_zcta_geodesic_area()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.geodesic_area_square_meters := extensions.ST_Area(new.geometry::extensions.geography);
  return new;
end;
$$;

create trigger set_zcta_geodesic_area_before_write
before insert or update of geometry on public.zcta_geographies
for each row execute function private.set_zcta_geodesic_area();

create function public.backfill_zcta_geodesic_area_batch(
  p_dataset_version text,
  p_batch_size integer default 100
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_total integer; v_before integer; v_updated integer; v_remaining integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'batch size must be between 1 and 500' using errcode = '22023';
  end if;
  if not exists (select 1 from public.zcta_dataset_versions where version=p_dataset_version and status='active') then
    raise exception 'active governed dataset required' using errcode = '22023';
  end if;
  select count(*), count(*) filter (where geodesic_area_square_meters > 0)
    into v_total, v_before from public.zcta_geographies where dataset_version=p_dataset_version;
  with batch as (
    select dataset_version,zcta5 from public.zcta_geographies
    where dataset_version=p_dataset_version and geodesic_area_square_meters is null
    order by zcta5 limit p_batch_size for update skip locked
  )
  update public.zcta_geographies z
  set geodesic_area_square_meters=extensions.ST_Area(z.geometry::extensions.geography)
  from batch b where z.dataset_version=b.dataset_version and z.zcta5=b.zcta5;
  get diagnostics v_updated = row_count;
  select count(*) into v_remaining from public.zcta_geographies
    where dataset_version=p_dataset_version and geodesic_area_square_meters is null;
  return jsonb_build_object('dataset_version',p_dataset_version,'total',v_total,'populated_before',v_before,
    'populated_this_batch',v_updated,'remaining',v_remaining,'complete',v_remaining=0);
end;
$$;
revoke all on function public.backfill_zcta_geodesic_area_batch(text,integer) from public,anon,authenticated;
grant execute on function public.backfill_zcta_geodesic_area_batch(text,integer) to service_role;
