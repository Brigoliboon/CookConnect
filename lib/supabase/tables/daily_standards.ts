import type { DailyStandard } from "../models"

function isValidDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

export async function listDailyStandards(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  standardDate: string,
  subscriptionPlanId?: string,
  mealsPerDay?: number,
): Promise<DailyStandard[]> {
  if (!isValidDate(standardDate)) throw new Error("standard_date (YYYY-MM-DD) is required")

  let query = supabase
    .from("daily_standards")
    .select("*")
    .eq("standard_date", standardDate)
    .order("position")

  if (subscriptionPlanId) query = query.eq("subscription_plan_id", subscriptionPlanId)
  if (mealsPerDay !== undefined) query = query.eq("meals_per_day", mealsPerDay)

  const { data, error } = await query

  if (error) throw error
  return (data as DailyStandard[]) ?? []
}

export async function setDailyStandard(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  standardDate: string,
  subscriptionPlanId: string,
  mealsPerDay: number,
  recipeIds: string[],
): Promise<DailyStandard[]> {
  if (!isValidDate(standardDate)) throw new Error("standard_date (YYYY-MM-DD) is required")

  const { error: delError } = await supabase
    .from("daily_standards")
    .delete()
    .eq("standard_date", standardDate)
    .eq("subscription_plan_id", subscriptionPlanId)
    .eq("meals_per_day", mealsPerDay)

  if (delError) throw delError

  if (recipeIds.length === 0) return []

  const { data, error } = await supabase
    .from("daily_standards")
    .insert(
      recipeIds.map((recipe_id, position) => ({
        standard_date: standardDate,
        subscription_plan_id: subscriptionPlanId,
        meals_per_day: mealsPerDay,
        position,
        recipe_id,
      })),
    )
    .select()

  if (error) throw error
  return (data as DailyStandard[]) ?? []
}
