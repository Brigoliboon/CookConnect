insert into public.subscription_plans (name, validity_days, price_cents, currency, details, is_active, type)
select '30-Day Meal Plan', 30, 0, 'AED', '{"slug":"standard-30"}'::jsonb, true, 'standard'
where not exists (
  select 1 from public.subscription_plans where details->>'slug' = 'standard-30'
);
