alter table public.recipes
  add column if not exists is_subscription_included boolean not null default false;

comment on column public.recipes.is_subscription_included is
  'When true, this recipe can be chosen on a subscription plan.';
