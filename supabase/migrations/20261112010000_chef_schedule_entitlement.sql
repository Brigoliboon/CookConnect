alter table public.chef_schedules
  add column if not exists counts_toward_entitlement boolean not null default true;

comment on column public.chef_schedules.counts_toward_entitlement is
  'When false (breakfast extras), remaining_meal_count is not consumed.';

-- Compensates the existing remaining_meal_count trigger, which counts every
-- chef_schedules row. Breakfast extras insert/delete as net zero against entitlement.
create or replace function public.adjust_remaining_for_non_entitlement_schedule()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.counts_toward_entitlement is false then
      update public.subscriptions
        set remaining_meal_count = remaining_meal_count + 1
        where id = new.subscription_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.counts_toward_entitlement is false then
      update public.subscriptions
        set remaining_meal_count = remaining_meal_count - 1
        where id = old.subscription_id;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.counts_toward_entitlement is distinct from new.counts_toward_entitlement then
      update public.subscriptions
        set remaining_meal_count = remaining_meal_count
          + case
              when new.counts_toward_entitlement is false then 1
              else -1
            end
        where id = new.subscription_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists chef_schedules_non_entitlement_adjust on public.chef_schedules;
create trigger chef_schedules_non_entitlement_adjust
  after insert or delete or update of counts_toward_entitlement
  on public.chef_schedules
  for each row
  execute function public.adjust_remaining_for_non_entitlement_schedule();

do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.daily_standards'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%meals_per_day%'
  loop
    execute format('alter table public.daily_standards drop constraint %I', r.conname);
  end loop;
end
$$;

alter table public.daily_standards
  add constraint daily_standards_meals_per_day_check
  check (meals_per_day >= 1 and meals_per_day <= 5);
