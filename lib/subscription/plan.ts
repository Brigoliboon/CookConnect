import { SUBSCRIPTION_PLANS, type SubscriptionPlan as CatalogPlan } from "@/constants/subscriptions"

export const PLAN_DAYS: Record<string, number> = Object.fromEntries(
  SUBSCRIPTION_PLANS.map((plan) => [plan.id, plan.durationDays]),
)

export type ActivePlanRow = {
  id: string
  name: string
  validity_days: number
  details: { slug?: string } | null
}

function normalizePlanKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ")
}

export function catalogPlanFromInput(raw: string): CatalogPlan | null {
  const key = normalizePlanKey(raw)
  if (!key) return null

  const byId = SUBSCRIPTION_PLANS.find((plan) => plan.id.toLowerCase() === key)
  if (byId) return byId

  const byName = SUBSCRIPTION_PLANS.find((plan) => plan.name.toLowerCase() === key)
  if (byName) return byName

  const days = Number(key)
  if (Number.isInteger(days) && days > 0) {
    const matches = SUBSCRIPTION_PLANS.filter((plan) => plan.durationDays === days)
    if (matches.length === 1) return matches[0]
  }

  return null
}

export function resolveActivePlan(plans: ActivePlanRow[], planSlug: string): ActivePlanRow | null {
  const validityDays = PLAN_DAYS[planSlug] ?? 30
  return (
    plans.find((candidate) => candidate.details?.slug === planSlug) ??
    plans.find((candidate) => candidate.validity_days === validityDays) ??
    null
  )
}

export async function listActivePlanRows(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<ActivePlanRow[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, validity_days, details")
    .eq("is_active", true)

  if (error) throw error
  return (data ?? []) as ActivePlanRow[]
}
