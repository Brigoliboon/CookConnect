import type { ChefSchedule } from "../models"

export async function listChefSchedules(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  scheduledDate: string,
): Promise<ChefSchedule[]> {
  const { data, error } = await supabase
    .from("chef_schedules")
    .select("*")
    .eq("scheduled_date", scheduledDate)

  if (error) throw error
  return (data as ChefSchedule[]) ?? []
}

export async function setChefSchedule(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  scheduledDate: string,
  subscriptionId: string,
  recipeIds: string[],
): Promise<ChefSchedule[]> {
  const { error: delError } = await supabase
    .from("chef_schedules")
    .delete()
    .eq("scheduled_date", scheduledDate)
    .eq("subscription_id", subscriptionId)

  if (delError) throw delError

  if (recipeIds.length === 0) return []

  const { data, error } = await supabase
    .from("chef_schedules")
    .insert(
      recipeIds.map((recipe_id) => ({
        scheduled_date: scheduledDate,
        subscription_id: subscriptionId,
        recipe_id,
      })),
    )
    .select()

  if (error) throw error
  return (data as ChefSchedule[]) ?? []
}
