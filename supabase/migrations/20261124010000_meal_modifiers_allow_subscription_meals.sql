-- Follow-up to 20261124000000_meal_modifiers.sql (do not edit that file).
-- Boon 2026-11-24: subscription meals do not get add-ons, but the same meal
-- ordered normally (cart / POS) can have modifiers.
--
-- This drops the per-meal blocks so groups may be attached to
-- is_subscription_included recipes, and a meal with groups may be marked
-- subscription-included. Subscription and Chef flows ignore groups and use
-- the base meal only. Regular cart and POS orders still require a pick
-- through create_order_with_modifiers (that RPC is not used by subscription
-- paths and is left unchanged).
--
-- Idempotent: safe to re-run. No user_role literals are added; existing
-- role checks stay employee and admin only.

drop trigger if exists meal_modifier_reject_subscription_link
  on public.meal_modifier_group_links;
drop trigger if exists meal_modifier_reject_subscription_flag
  on public.recipes;

drop function if exists public.meal_modifier_reject_subscription_link();
drop function if exists public.meal_modifier_reject_subscription_flag();

comment on table public.meal_modifier_group_links is
  'Attaches a group to a meal. Groups may be attached to subscription-included meals. Subscription and Chef flows ignore them (base meal, no add-ons). Regular cart and POS orders still require a pick.';
