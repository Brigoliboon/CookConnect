import type { PlanProteinCredit } from "../models"

export interface PlanProteinCreditWithIngredient extends PlanProteinCredit {
  ingredient: { id: string; name: string } | null
}

export async function listProteinCredits(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  subscriptionPlanId?: string,
): Promise<PlanProteinCreditWithIngredient[]> {
  let query = supabase
    .from("plan_protein_credits")
    .select("*, ingredient:ingredients(id, name)")
    .order("ingredient_id")

  if (subscriptionPlanId) {
    query = query.eq("subscription_plan_id", subscriptionPlanId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data as PlanProteinCreditWithIngredient[]) ?? []
}

export async function setProteinCredits(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  subscriptionPlanId: string,
  credits: { ingredient_id: string; allowance: number }[],
): Promise<PlanProteinCredit[]> {
  const { error: delError } = await supabase
    .from("plan_protein_credits")
    .delete()
    .eq("subscription_plan_id", subscriptionPlanId)

  if (delError) throw delError

  const rows = credits.filter((c) => c.ingredient_id && c.allowance >= 0)
  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from("plan_protein_credits")
    .insert(
      rows.map((c) => ({
        subscription_plan_id: subscriptionPlanId,
        ingredient_id: c.ingredient_id,
        allowance: Math.round(c.allowance),
      })),
    )
    .select()

  if (error) throw error
  return (data as PlanProteinCredit[]) ?? []
}
