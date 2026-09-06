create or replace function public.set_rider_location(lat double precision, lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.accounts
  set location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  where id = auth.uid();
end;
$$;

grant execute on function public.set_rider_location(double precision, double precision) to authenticated;
