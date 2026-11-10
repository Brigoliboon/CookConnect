import type { SupabaseClient } from "@supabase/supabase-js"

export interface SubscriptionPlanRate {
  plan_id: string
  plan_slug: string
  plan_name: string
  validity_days: number
  meals_per_day: number
  total_meals: number
  list_price_cents: number
  floor_price_cents: number
  counter_offers_cents: number[]
  currency: string
}

export async function getSubscriptionPlanRate(
  supabase: SupabaseClient,
  planSlug: string,
  mealsPerDay: number,
): Promise<SubscriptionPlanRate | null> {
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("id, name, validity_days, details")
    .eq("is_active", true)
    .contains("details", { slug: planSlug })
    .maybeSingle()

  if (planError) throw planError
  if (!plan) return null

  const { data: rate, error: rateError } = await supabase
    .from("subscription_plan_rates")
    .select("meals_per_day, list_price_cents, floor_price_cents, counter_offers_cents, currency")
    .eq("subscription_plan_id", plan.id)
    .eq("meals_per_day", mealsPerDay)
    .eq("is_active", true)
    .maybeSingle()

  if (rateError) throw rateError
  if (!rate) return null

  return {
    plan_id: plan.id,
    plan_slug: planSlug,
    plan_name: plan.name,
    validity_days: plan.validity_days,
    meals_per_day: rate.meals_per_day,
    total_meals: plan.validity_days * rate.meals_per_day,
    list_price_cents: Number(rate.list_price_cents),
    floor_price_cents: Number(rate.floor_price_cents),
    counter_offers_cents: (rate.counter_offers_cents ?? []).map(Number),
    currency: rate.currency,
  }
}
