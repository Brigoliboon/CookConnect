create table if not exists public.order_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  rider_id uuid not null references public.accounts(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'delivered', 'cancelled')),
  assigned_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_deliveries_rider on public.order_deliveries(rider_id, assigned_at desc);
create index if not exists idx_order_deliveries_order on public.order_deliveries(order_id);

alter table public.order_deliveries enable row level security;

drop policy if exists order_deliveries_insert_own on public.order_deliveries;
create policy order_deliveries_insert_own on public.order_deliveries
  for insert to authenticated with check ((select auth.uid()) = rider_id);

drop policy if exists order_deliveries_select_own on public.order_deliveries;
create policy order_deliveries_select_own on public.order_deliveries
  for select to authenticated using ((select auth.uid()) = rider_id);

drop policy if exists order_deliveries_update_own on public.order_deliveries;
create policy order_deliveries_update_own on public.order_deliveries
  for update to authenticated
  using ((select auth.uid()) = rider_id)
  with check ((select auth.uid()) = rider_id);
