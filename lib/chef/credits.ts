export interface ProteinAllowance {
  ingredient_id: string
  allowance: number
  ingredient: { id: string; name: string } | null
}

export interface ProteinBucketState {
  ingredientId: string
  name: string
  allowance: number
  used: number
  remaining: number
}

/**
 * Remaining protein credits for one subscription.
 * `picks` = ALL chef_schedules rows for the subscription (whole period, not one day).
 * `recipeProtein` maps recipe_id -> primary_protein_ingredient_id (null = unattributed).
 */
export function proteinBuckets(
  allowances: ProteinAllowance[],
  recipeProtein: Map<string, string | null>,
  picks: { recipe_id: string }[],
): ProteinBucketState[] {
  const usedBy = new Map<string, number>()
  for (const p of picks) {
    const protein = recipeProtein.get(p.recipe_id)
    if (!protein) continue
    usedBy.set(protein, (usedBy.get(protein) ?? 0) + 1)
  }
  return allowances.map((a) => {
    const used = usedBy.get(a.ingredient_id) ?? 0
    return {
      ingredientId: a.ingredient_id,
      name: a.ingredient?.name ?? a.ingredient_id.slice(0, 8),
      allowance: a.allowance,
      used,
      remaining: a.allowance - used,
    }
  })
}

/** Protein bucket of a single recipe, if attributed. */
export function recipeProteinBucket(
  recipeProtein: Map<string, string | null>,
  recipeId: string,
): string | null {
  return recipeProtein.get(recipeId) ?? null
}
