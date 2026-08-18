import type { ServingIngredient, SubscriptionIngredientQuota } from "@/lib/supabase/models"

export interface QuotaConsumption {
  ingredientId: string
  grams: number
}

/**
 * Round to 2 decimals to avoid float drift when storing grams.
 */
export function roundGrams(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Aggregated grams consumed per ingredient for `servings` of a recipe
 * (quantity_g per serving × servings). Ingredients with an empty id are skipped.
 */
export function calculateQuotaConsumption(
  recipeIngredients: Pick<ServingIngredient, "ingredient_id" | "quantity_g">[],
  servings: number,
): QuotaConsumption[] {
  if (!Number.isInteger(servings) || servings < 1) {
    throw new Error("servings must be a positive integer")
  }

  const byIngredient = new Map<string, number>()
  for (const { ingredient_id, quantity_g } of recipeIngredients) {
    if (!ingredient_id) continue
    const grams = roundGrams(quantity_g * servings)
    byIngredient.set(ingredient_id, (byIngredient.get(ingredient_id) ?? 0) + grams)
  }

  return [...byIngredient.entries()]
    .map(([ingredientId, grams]) => ({ ingredientId, grams }))
    .sort((a, b) => a.ingredientId.localeCompare(b.ingredientId))
}

/**
 * Remaining credits: total minus used, clamped at zero.
 */
export function getRemainingCredits(quotaTotalG: number, quotaUsedG: number): number {
  return roundGrams(Math.max(quotaTotalG - quotaUsedG, 0))
}

/**
 * Whether `requestedG` more grams fit within the quota.
 * Rejects non-finite and negative requests.
 */
export function canConsume(quotaTotalG: number, quotaUsedG: number, requestedG: number): boolean {
  if (!Number.isFinite(requestedG) || requestedG < 0) return false
  return quotaUsedG + requestedG <= quotaTotalG
}

export interface QuotaSummary {
  quotaTotalG: number
  quotaUsedG: number
  remainingG: number
  ratio: number
}

export function summarizeQuota(
  quota: Pick<SubscriptionIngredientQuota, "quota_total_g" | "quota_used_g">,
): QuotaSummary {
  const total = quota.quota_total_g
  const used = Math.min(Math.max(quota.quota_used_g, 0), total)
  return {
    quotaTotalG: total,
    quotaUsedG: roundGrams(used),
    remainingG: getRemainingCredits(total, used),
    ratio: total > 0 ? roundGrams(used / total) : 0,
  }
}
