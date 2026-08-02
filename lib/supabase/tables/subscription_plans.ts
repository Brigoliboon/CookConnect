import type { SubscriptionPlan } from "../models"

export async function listActivePlans(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_cents", { ascending: true })

  if (error) throw error
  return (data as SubscriptionPlan[]) ?? []
}
