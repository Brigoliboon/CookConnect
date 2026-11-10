drop view if exists public.recipe_sales_stats;
drop trigger if exists sales_sync_order_status on public.orders;
drop function if exists public.sales_sync_order_status();
drop trigger if exists sales_sync_subscription_payment on public.subscription_payments;
drop function if exists public.sales_sync_subscription_payment();
drop table if exists public.sales;

alter table public.orders add column if not exists origin text not null default 'web';
alter table public.orders drop constraint if exists orders_origin_check;
alter table public.orders
  add constraint orders_origin_check check (origin in ('web', 'pos', 'whatsapp'));

update public.orders set origin = 'pos' where address = 'Dine-in' and origin = 'web';

alter table public.orders add column if not exists delivered_at timestamptz;

create index if not exists idx_orders_delivered_at
  on public.orders (delivered_at desc)
  where status = 'delivered';

create or replace function public.orders_set_delivered_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    new.delivered_at := coalesce(new.delivered_at, now());
  elsif new.status is distinct from 'delivered' then
    new.delivered_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_delivered_at on public.orders;
create trigger trg_orders_delivered_at
  before update of status on public.orders
  for each row
  execute function public.orders_set_delivered_at();

update public.orders o
set delivered_at = od.delivered_at
from public.order_deliveries od
where od.order_id = o.id
  and o.status = 'delivered'
  and o.delivered_at is null;

update public.orders
set delivered_at = coalesce(updated_at, created_at)
where status = 'delivered'
  and delivered_at is null;
