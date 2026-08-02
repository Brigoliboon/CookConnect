import type { Ingredient, SubscriptionIngredientQuota } from "../models"
import { canConsume, getRemainingCredits, roundGrams } from "@/lib/subscriptions/quota"

const MAX_RETRIES = 5

export class InsufficientQuotaError extends Error {
  constructor(
    public readonly ingredientId: string,
    public readonly requestedG: number,
    public readonly availableG: number,
  ) {
    super(`Insufficient quota for ingredient ${ingredientId}: requested ${requestedG}g, available ${availableG}g`)
    this.name = "InsufficientQuotaError"
  }
}

export interface QuotaWithIngredient extends SubscriptionIngredientQuota {
  ingredient: Pick<Ingredient, "id" | "name" | "nutrition"> | null
}

export async function listQuotasForSubscription(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  subscriptionId: string,
): Promise<SubscriptionIngredientQuota[]> {
  const { data, error } = await supabase
    .from("subscription_ingredient_quotas")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("ingredient_id")

  if (error) throw error
  return (data as SubscriptionIngredientQuota[]) ?? []
}

export async function listQuotasWithIngredients(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  subscriptionId: string,
): Promise<QuotaWithIngredient[]> {
  const { data, error } = await supabase
    .from("subscription_ingredient_quotas")
    .select("*, ingredient:ingredients(id, name, nutrition)")
    .eq("subscription_id", subscriptionId)
    .order("ingredient_id")

  if (error) throw error
  return (data as QuotaWithIngredient[]) ?? []
}

/**
 * Set (or create) the weekly quota total for an ingredient on a subscription.
 * Used when configuring a subscription's ingredient ratios.
 */
export async function setQuotaTotal(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  subscriptionId: string,
  ingredientId: string,
  totalG: number,
): Promise<SubscriptionIngredientQuota> {
  const total = roundGrams(totalG)
  if (!Number.isFinite(total) || total < 0) {
    throw new Error("quota_total_g must be a non-negative number")
  }

  const { data: existing } = await supabase
    .from("subscription_ingredient_quotas")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .eq("ingredient_id", ingredientId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from("subscription_ingredient_quotas")
      .update({ quota_total_g: total, updated_at: new Date().toISOString() })
      .eq("id", (existing as SubscriptionIngredientQuota).id)
      .select()
      .single()
    if (error) throw error
    return data as SubscriptionIngredientQuota
  }

  const { data, error } = await supabase
    .from("subscription_ingredient_quotas")
    .insert({
      subscription_id: subscriptionId,
      ingredient_id: ingredientId,
      quota_total_g: total,
      quota_used_g: 0,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as SubscriptionIngredientQuota
}

/**
 * Atomically increment `quota_used_g` by `grams` for an ingredient.
 *
 * Uses optimistic concurrency: reads the row, then updates it guarded by the
 * previously-read `quota_used_g` value. If the guard fails (concurrent write),
 * it retries. Throws `InsufficientQuotaError` when the request would exceed
 * `quota_total_g` — never over-consumes.
 */
export async function consumeQuota(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  subscriptionId: string,
  ingredientId: string,
  grams: number,
): Promise<SubscriptionIngredientQuota> {
  const amount = roundGrams(grams)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("grams must be a non-negative number")
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error } = await supabase
      .from("subscription_ingredient_quotas")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .eq("ingredient_id", ingredientId)
      .maybeSingle()

    if (error) throw error
    const quota = data as SubscriptionIngredientQuota | null
    if (!quota) {
      throw new Error(`No quota row for ingredient ${ingredientId} on subscription ${subscriptionId}`)
    }

    const available = getRemainingCredits(quota.quota_total_g, quota.quota_used_g)
    if (!canConsume(quota.quota_total_g, quota.quota_used_g, amount)) {
      throw new InsufficientQuotaError(ingredientId, amount, available)
    }

    const newUsed = roundGrams(quota.quota_used_g + amount)
    const { data: updated, error: updateError } = await supabase
      .from("subscription_ingredient_quotas")
      .update({ quota_used_g: newUsed, updated_at: new Date().toISOString() })
      .eq("id", quota.id)
      .eq("quota_used_g", quota.quota_used_g)
      .select()
      .maybeSingle()

    if (updateError) throw updateError
    if (updated) return updated as SubscriptionIngredientQuota
    // CAS conflict — another request changed the row; retry.
  }

  throw new Error(`Failed to consume quota for ingredient ${ingredientId} after ${MAX_RETRIES} attempts`)
}

/**
 * Reset usage to zero for a subscription (weekly refresh). Optionally scoped
 * to a single ingredient.
 */
export async function resetQuotaUsage(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  subscriptionId: string,
  ingredientId?: string,
): Promise<void> {
  let query = supabase
    .from("subscription_ingredient_quotas")
    .update({ quota_used_g: 0, updated_at: new Date().toISOString() })
    .eq("subscription_id", subscriptionId)

  if (ingredientId) query = query.eq("ingredient_id", ingredientId)

  const { error } = await query
  if (error) throw error
}
