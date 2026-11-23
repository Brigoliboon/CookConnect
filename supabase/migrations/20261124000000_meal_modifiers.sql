-- FR-50 / M16 v1: meal modifiers.
-- Reusable single-select groups attached to meals ("Choose your side").
-- A group is required when attached. There is no multi-select and no optional
-- group in v1 (no selection_type / is_required columns).
--
-- The add-on price is configured per option (price_cents, 0 = free) and is
-- independent of the option recipe's menu/serving price.
--
-- Orders snapshot the chosen group, option, price, side recipe_id, and
-- English/Arabic names in order_item_modifiers. Snapshots are written only by
-- the security-definer RPC public.create_order_with_modifiers; client prices
-- and VAT are ignored. VAT is 5% of the server subtotal, in AED cents (FR-9).
--
-- v1 applies to regular orders, the cart, and POS only. Groups cannot be
-- attached to recipes.is_subscription_included meals (subscriptions, Chef,
-- macros, and meal CSV are out of v1; FR-48 stays separate).
--
-- A meal with an attached active group that has no active options cannot be
-- ordered until an active option is added or the group is detached/deactivated.
--
-- To delete a side recipe used as an option: deactivate or unlink the option
-- first (set recipe_id to null, or delete/deactivate the option). Option
-- recipe_id uses ON DELETE RESTRICT. Snapshot recipe_id uses ON DELETE SET NULL
-- so historical orders do not block the delete after options are unlinked.
--
-- Setting a second is_default=true in a group clears the previous default in
-- the same statement (trigger meal_modifier_options_one_default).
--
-- The experimental recipe_addons / order_item_addons tables are left in place.
-- Historical orders keep rendering through a compatibility read of
-- order_item_addons. Drop those tables in a later follow-up after rows are
-- copied into order_item_modifiers.

-- Role checks use only values on public.user_role: employee and admin.
-- There is no chef or rider value on that enum; customer reads go through
-- order.customer_id, not a role literal.
drop function if exists public.is_staff_account();

create or replace function public.is_employee_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = (select auth.uid())
      and a.role in ('employee', 'admin')
  );
$$;

revoke all on function public.is_employee_or_admin() from public;
grant execute on function public.is_employee_or_admin() to anon, authenticated;

create table if not exists public.meal_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_modifier_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.meal_modifier_groups(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete restrict,
  name text not null,
  name_ar text,
  price_cents integer not null default 0 check (price_cents >= 0),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One default per group. A second is_default=true is swapped by the trigger
-- below before this unique index is checked.
create unique index if not exists idx_meal_modifier_options_one_default
  on public.meal_modifier_options(group_id)
  where is_default;

-- Case-insensitive unique name among active options only, so a retired name
-- can be reused. Names should be trimmed by the API before insert.
create unique index if not exists idx_meal_modifier_options_active_name
  on public.meal_modifier_options (group_id, lower(btrim(name)))
  where is_active;

create table if not exists public.meal_modifier_group_links (
  id uuid primary key default gen_random_uuid(),
  meal_recipe_id uuid not null references public.recipes(id) on delete cascade,
  group_id uuid not null references public.meal_modifier_groups(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (meal_recipe_id, group_id)
);

create table if not exists public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  group_id uuid references public.meal_modifier_groups(id) on delete set null,
  option_id uuid references public.meal_modifier_options(id) on delete set null,
  group_name text not null,
  group_name_ar text,
  option_name text not null,
  option_name_ar text,
  recipe_id uuid references public.recipes(id) on delete set null,
  price_cents integer not null default 0 check (price_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_meal_modifier_options_group
  on public.meal_modifier_options(group_id, sort_order);
create index if not exists idx_meal_modifier_group_links_meal
  on public.meal_modifier_group_links(meal_recipe_id, sort_order);
create index if not exists idx_meal_modifier_group_links_group
  on public.meal_modifier_group_links(group_id);
create index if not exists idx_order_item_modifiers_item
  on public.order_item_modifiers(order_item_id);
create index if not exists idx_order_item_modifiers_recipe
  on public.order_item_modifiers(recipe_id);

comment on table public.meal_modifier_groups is
  'Reusable v1 single-select modifier groups. Required when attached to a meal.';
comment on table public.meal_modifier_options is
  'Options in a modifier group. price_cents is the add-on, independent of the side recipe menu price.';
comment on column public.meal_modifier_options.recipe_id is
  'Optional side recipe. ON DELETE RESTRICT: deactivate or unlink the option before deleting the recipe.';
comment on table public.meal_modifier_group_links is
  'Attaches a group to a meal. Subscription-included meals are rejected by trigger.';
comment on table public.order_item_modifiers is
  'Order-line snapshot of the chosen group, option, price, side recipe, and EN/AR names. Written only by create_order_with_modifiers.';

-- Default swap: clear any other default in the group in the same statement.
create or replace function public.meal_modifier_options_one_default()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.meal_modifier_options
    set is_default = false,
        updated_at = now()
    where group_id = new.group_id
      and is_default
      and id is distinct from new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists meal_modifier_options_one_default on public.meal_modifier_options;
create trigger meal_modifier_options_one_default
  before insert or update of is_default on public.meal_modifier_options
  for each row
  when (new.is_default)
  execute procedure public.meal_modifier_options_one_default();

-- v1: no modifier groups on subscription-included meals (both directions).
create or replace function public.meal_modifier_reject_subscription_link()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.recipes r
    where r.id = new.meal_recipe_id
      and r.is_subscription_included
  ) then
    raise exception 'Modifier groups cannot be attached to subscription meals in v1'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists meal_modifier_reject_subscription_link on public.meal_modifier_group_links;
create trigger meal_modifier_reject_subscription_link
  before insert or update of meal_recipe_id on public.meal_modifier_group_links
  for each row
  execute procedure public.meal_modifier_reject_subscription_link();

create or replace function public.meal_modifier_reject_subscription_flag()
returns trigger
language plpgsql
as $$
begin
  if new.is_subscription_included and exists (
    select 1
    from public.meal_modifier_group_links l
    where l.meal_recipe_id = new.id
  ) then
    raise exception 'Detach modifier groups before marking a meal as subscription-included'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists meal_modifier_reject_subscription_flag on public.recipes;
create trigger meal_modifier_reject_subscription_flag
  before update of is_subscription_included on public.recipes
  for each row
  when (new.is_subscription_included and new.is_subscription_included is distinct from old.is_subscription_included)
  execute procedure public.meal_modifier_reject_subscription_flag();

alter table public.meal_modifier_groups enable row level security;
alter table public.meal_modifier_options enable row level security;
alter table public.meal_modifier_group_links enable row level security;
alter table public.order_item_modifiers enable row level security;

-- Public menu: active groups, active options of active groups, links to active groups.
drop policy if exists meal_modifier_groups_public_read on public.meal_modifier_groups;
create policy meal_modifier_groups_public_read on public.meal_modifier_groups
  for select to anon, authenticated
  using (is_active);

drop policy if exists meal_modifier_groups_staff_read on public.meal_modifier_groups;
create policy meal_modifier_groups_staff_read on public.meal_modifier_groups
  for select to authenticated
  using (public.is_employee_or_admin());

drop policy if exists meal_modifier_options_public_read on public.meal_modifier_options;
create policy meal_modifier_options_public_read on public.meal_modifier_options
  for select to anon, authenticated
  using (
    is_active
    and exists (
      select 1
      from public.meal_modifier_groups g
      where g.id = group_id
        and g.is_active
    )
  );

drop policy if exists meal_modifier_options_staff_read on public.meal_modifier_options;
create policy meal_modifier_options_staff_read on public.meal_modifier_options
  for select to authenticated
  using (public.is_employee_or_admin());

drop policy if exists meal_modifier_group_links_public_read on public.meal_modifier_group_links;
create policy meal_modifier_group_links_public_read on public.meal_modifier_group_links
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.meal_modifier_groups g
      where g.id = group_id
        and g.is_active
    )
  );

drop policy if exists meal_modifier_group_links_staff_read on public.meal_modifier_group_links;
create policy meal_modifier_group_links_staff_read on public.meal_modifier_group_links
  for select to authenticated
  using (public.is_employee_or_admin());

drop policy if exists meal_modifier_groups_staff_write on public.meal_modifier_groups;
create policy meal_modifier_groups_staff_write on public.meal_modifier_groups
  for all to authenticated
  using (public.is_employee_or_admin())
  with check (public.is_employee_or_admin());

drop policy if exists meal_modifier_options_staff_write on public.meal_modifier_options;
create policy meal_modifier_options_staff_write on public.meal_modifier_options
  for all to authenticated
  using (public.is_employee_or_admin())
  with check (public.is_employee_or_admin());

drop policy if exists meal_modifier_group_links_staff_write on public.meal_modifier_group_links;
create policy meal_modifier_group_links_staff_write on public.meal_modifier_group_links
  for all to authenticated
  using (public.is_employee_or_admin())
  with check (public.is_employee_or_admin());

-- Snapshots: no direct insert/update/delete for anon or authenticated.
-- Reads follow the parent order (employee/admin, or the customer who owns the order).
-- Public tracking goes through the Next.js API with a server client, not anon RLS.
drop policy if exists order_item_modifiers_insert on public.order_item_modifiers;
drop policy if exists order_item_modifiers_read on public.order_item_modifiers;

drop policy if exists order_item_modifiers_staff_read on public.order_item_modifiers;
create policy order_item_modifiers_staff_read on public.order_item_modifiers
  for select to authenticated
  using (public.is_employee_or_admin());

drop policy if exists order_item_modifiers_customer_read on public.order_item_modifiers;
create policy order_item_modifiers_customer_read on public.order_item_modifiers
  for select to authenticated
  using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id
        and o.customer_id is not null
        and o.customer_id = (select auth.uid())
    )
  );

revoke insert, update, delete on public.order_item_modifiers from anon, authenticated, public;
grant select on public.order_item_modifiers to authenticated;

-- Atomic order + items + modifier snapshots. Client unit prices, subtotals,
-- and VAT are ignored. One transaction: a failed modifier write rolls back
-- the order.
create or replace function public.create_order_with_modifiers(
  p_order jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_recipe_id uuid;
  v_qty integer;
  v_note text;
  v_option_ids uuid[];
  v_recipe record;
  v_base_cents integer;
  v_extra_cents integer;
  v_unit_cents integer;
  v_group record;
  v_selected uuid[];
  v_option record;
  v_oid uuid;
  v_priced jsonb := '[]'::jsonb;
  v_snapshots jsonb;
  v_row jsonb;
  v_subtotal integer := 0;
  v_vat integer;
  v_order_id uuid;
  v_item_id uuid;
  v_shipping integer;
  v_status text;
  v_origin text;
  v_currency text;
  v_name text;
  v_email text;
  v_mobile text;
  v_result jsonb;
  v_out_items jsonb := '[]'::jsonb;
  v_out_mods jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one item is required' using errcode = '22023';
  end if;

  v_name := nullif(btrim(p_order->>'name'), '');
  v_email := nullif(btrim(p_order->>'email'), '');
  v_mobile := nullif(btrim(p_order->>'mobile_number'), '');
  if v_name is null or v_email is null or v_mobile is null then
    raise exception 'name, email, and mobile_number are required' using errcode = '22023';
  end if;

  v_shipping := coalesce((p_order->>'shipping_cents')::integer, 0);
  if v_shipping < 0 then
    raise exception 'shipping_cents is invalid' using errcode = '22023';
  end if;

  v_status := coalesce(nullif(btrim(p_order->>'status'), ''), 'inquiry');
  v_origin := coalesce(nullif(btrim(p_order->>'origin'), ''), 'web');
  v_currency := coalesce(nullif(btrim(p_order->>'currency'), ''), 'AED');

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_recipe_id := (v_item->>'recipe_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Each item requires a recipe_id' using errcode = '22023';
    end;
    if v_recipe_id is null then
      raise exception 'Each item requires a recipe_id' using errcode = '22023';
    end if;

    begin
      v_qty := (v_item->>'qty')::integer;
    exception when others then
      raise exception 'qty must be an integer between 1 and 100' using errcode = '22023';
    end;
    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'qty must be an integer between 1 and 100' using errcode = '22023';
    end if;

    v_note := nullif(btrim(v_item->>'note'), '');

    select coalesce(array_agg(x::uuid), array[]::uuid[])
    into v_option_ids
    from (
      select jsonb_array_elements_text(coalesce(v_item->'option_ids', '[]'::jsonb)) as x
      union all
      select e->>'option_id'
      from jsonb_array_elements(coalesce(v_item->'modifiers', '[]'::jsonb)) e
      where e ? 'option_id'
    ) opts
    where nullif(btrim(x), '') is not null;

    select r.id, r.name, r.image_path, r.is_active
    into v_recipe
    from public.recipes r
    where r.id = v_recipe_id;

    if v_recipe.id is null then
      raise exception 'Unknown recipe_id: %', v_recipe_id using errcode = '22023';
    end if;
    if not v_recipe.is_active then
      raise exception 'Recipe is not available: %', v_recipe.name using errcode = '22023';
    end if;

    select round(s.price::numeric * 100)::integer
    into v_base_cents
    from public.servings s
    where s.recipe_id = v_recipe_id
      and s.is_active
      and s.price is not null
    order by s.created_at
    limit 1;

    if v_base_cents is null then
      raise exception 'Meal has no active serving price' using errcode = '22023';
    end if;

    v_extra_cents := 0;
    v_snapshots := '[]'::jsonb;

    for v_group in
      select g.id, g.name, g.name_ar
      from public.meal_modifier_group_links l
      join public.meal_modifier_groups g on g.id = l.group_id
      where l.meal_recipe_id = v_recipe_id
        and g.is_active
      order by l.sort_order, g.sort_order, g.name
    loop
      if not exists (
        select 1
        from public.meal_modifier_options o
        where o.group_id = v_group.id
          and o.is_active
      ) then
        raise exception 'Meal cannot be ordered: group "%" has no active options', v_group.name
          using errcode = '22023';
      end if;

      select coalesce(array_agg(o.id), array[]::uuid[])
      into v_selected
      from public.meal_modifier_options o
      where o.group_id = v_group.id
        and o.is_active
        and o.id = any (v_option_ids);

      if coalesce(array_length(v_selected, 1), 0) <> 1 then
        raise exception 'Pick exactly one option for "%"', v_group.name
          using errcode = '22023';
      end if;

      select o.id, o.name, o.name_ar, o.price_cents, o.recipe_id
      into v_option
      from public.meal_modifier_options o
      where o.id = v_selected[1];

      v_extra_cents := v_extra_cents + v_option.price_cents;
      v_snapshots := v_snapshots || jsonb_build_array(jsonb_build_object(
        'group_id', v_group.id,
        'option_id', v_option.id,
        'group_name', v_group.name,
        'group_name_ar', v_group.name_ar,
        'option_name', v_option.name,
        'option_name_ar', v_option.name_ar,
        'recipe_id', v_option.recipe_id,
        'price_cents', v_option.price_cents
      ));
    end loop;

    foreach v_oid in array v_option_ids
    loop
      if not exists (
        select 1
        from public.meal_modifier_options o
        join public.meal_modifier_groups g on g.id = o.group_id
        join public.meal_modifier_group_links l
          on l.group_id = g.id and l.meal_recipe_id = v_recipe_id
        where o.id = v_oid
          and o.is_active
          and g.is_active
      ) then
        raise exception 'Invalid side selection for this meal' using errcode = '22023';
      end if;
    end loop;

    v_unit_cents := v_base_cents + v_extra_cents;
    v_subtotal := v_subtotal + v_unit_cents * v_qty;
    v_priced := v_priced || jsonb_build_array(jsonb_build_object(
      'recipe_id', v_recipe_id,
      'name', v_recipe.name,
      'image_path', v_recipe.image_path,
      'unit_price_cents', v_unit_cents,
      'qty', v_qty,
      'note', v_note,
      'snapshots', v_snapshots
    ));
  end loop;

  -- FR-9: VAT-inclusive display; vat_cents is 5% of the server subtotal in AED cents.
  v_vat := round(v_subtotal * 0.05)::integer;

  insert into public.orders (
    customer_id,
    name,
    email,
    mobile_number,
    address,
    status,
    origin,
    subtotal_cents,
    shipping_cents,
    vat_cents,
    currency,
    details
  )
  values (
    nullif(p_order->>'customer_id', '')::uuid,
    v_name,
    v_email,
    v_mobile,
    nullif(btrim(p_order->>'address'), ''),
    v_status,
    v_origin,
    v_subtotal,
    v_shipping,
    v_vat,
    v_currency,
    coalesce(p_order->'details', '{}'::jsonb)
  )
  returning id into v_order_id;

  for v_row in select value from jsonb_array_elements(v_priced)
  loop
    insert into public.order_items (
      order_id,
      recipe_id,
      name,
      unit_price_cents,
      qty,
      note,
      image_path
    )
    values (
      v_order_id,
      (v_row->>'recipe_id')::uuid,
      v_row->>'name',
      (v_row->>'unit_price_cents')::integer,
      (v_row->>'qty')::integer,
      nullif(v_row->>'note', ''),
      nullif(v_row->>'image_path', '')
    )
    returning id into v_item_id;

    v_out_mods := '[]'::jsonb;
    for v_item in select value from jsonb_array_elements(coalesce(v_row->'snapshots', '[]'::jsonb))
    loop
      insert into public.order_item_modifiers (
        order_item_id,
        group_id,
        option_id,
        group_name,
        group_name_ar,
        option_name,
        option_name_ar,
        recipe_id,
        price_cents
      )
      values (
        v_item_id,
        (v_item->>'group_id')::uuid,
        (v_item->>'option_id')::uuid,
        v_item->>'group_name',
        nullif(v_item->>'group_name_ar', ''),
        v_item->>'option_name',
        nullif(v_item->>'option_name_ar', ''),
        nullif(v_item->>'recipe_id', '')::uuid,
        (v_item->>'price_cents')::integer
      );
      v_out_mods := v_out_mods || jsonb_build_array(v_item || jsonb_build_object('order_item_id', v_item_id));
    end loop;

    v_out_items := v_out_items || jsonb_build_array(
      (v_row - 'snapshots') || jsonb_build_object('id', v_item_id, 'modifiers', v_out_mods)
    );
  end loop;

  select to_jsonb(o) into v_result
  from public.orders o
  where o.id = v_order_id;

  v_result := v_result || jsonb_build_object('items', v_out_items);
  return v_result;
end;
$$;

comment on function public.create_order_with_modifiers(jsonb, jsonb) is
  'Atomically creates an order, its items, and modifier snapshots. Server-priced; VAT is 5% of subtotal in AED cents. Does not write order_item_addons.';

revoke all on function public.create_order_with_modifiers(jsonb, jsonb) from public;
grant execute on function public.create_order_with_modifiers(jsonb, jsonb) to anon, authenticated;

grant select on public.meal_modifier_groups, public.meal_modifier_options, public.meal_modifier_group_links
  to anon, authenticated;
grant insert, update, delete on public.meal_modifier_groups, public.meal_modifier_options, public.meal_modifier_group_links
  to authenticated;
