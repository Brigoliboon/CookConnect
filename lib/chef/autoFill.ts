import type { ProteinAllowance } from "./credits"

export interface AutoFillRecipe {
  id: string
  name: string
  primary_protein_ingredient_id: string | null
  servings: { ingredients?: { name: string }[] }[]
}

export interface AutoFillSub {
  id: string
  customerName: string
  subscription_plan_id: string
  mealsPerDay: number
  /** lowercase restricted ingredient names */
  restrictedNames: string[]
  /** stored remaining_meal_count, null when unknown (no trim applied) */
  remainingMeals: number | null
}

export type AutoFillIssueKind =
  | "swapped-restriction"
  | "swapped-credit"
  | "trimmed"
  | "depleted"
  | "no-replacement"
  | "no-standard"
  | "skipped"

export interface AutoFillIssue {
  kind: AutoFillIssueKind
  message: string
}

export interface AutoFillResult {
  subscriptionId: string
  customerName: string
  recipeIds: string[]
  issues: AutoFillIssue[]
  skipped: boolean
}

function passesRestrictions(r: AutoFillRecipe, restricted: Set<string>): boolean {
  if (restricted.size === 0) return true
  return !(r.servings ?? []).some((s) =>
    (s.ingredients ?? []).some((ing) => restricted.has(ing.name.toLowerCase())),
  )
}

export function autoFillDay(args: {
  subs: AutoFillSub[]
  /** key `${planId}::${mealsPerDay}` -> ordered recipe ids of the day's standard */
  standards: Map<string, string[]>
  recipes: AutoFillRecipe[]
  /** already-saved picks for the date */
  existingBySub: Map<string, Set<string>>
  allowancesByPlan: Map<string, ProteinAllowance[]>
  /** ALL picks per subscription (whole period) for credit accounting */
  allPicksBySub: Map<string, { recipe_id: string }[]>
  recipeProtein: Map<string, string | null>
}): AutoFillResult[] {
  const byId = new Map(args.recipes.map((r) => [r.id, r]))

  // seed running credit usage from history (whole subscription period)
  const usedBySub = new Map<string, Map<string, number>>()
  for (const [subId, picks] of args.allPicksBySub) {
    const m = new Map<string, number>()
    for (const p of picks) {
      const prot = args.recipeProtein.get(p.recipe_id)
      if (!prot) continue
      m.set(prot, (m.get(prot) ?? 0) + 1)
    }
    usedBySub.set(subId, m)
  }

  return args.subs.map((sub) => {
    const existing = args.existingBySub.get(sub.id)
    if (existing && existing.size > 0) {
      return { subscriptionId: sub.id, customerName: sub.customerName, recipeIds: [], issues: [], skipped: true }
    }

    const standard = args.standards.get(`${sub.subscription_plan_id}::${sub.mealsPerDay}`) ?? []
    if (standard.length === 0) {
      return {
        subscriptionId: sub.id,
        customerName: sub.customerName,
        recipeIds: [],
        issues: [{ kind: "no-standard", message: "No standard set for today — pick manually." }],
        skipped: false,
      }
    }

    const issues: AutoFillIssue[] = []
    const restricted = new Set(sub.restrictedNames.map((n) => n.toLowerCase()))
    const allowances = args.allowancesByPlan.get(sub.subscription_plan_id) ?? []
    const allowByProtein = new Map(allowances.map((a) => [a.ingredient_id, a.allowance]))
    const used = new Map(usedBySub.get(sub.id) ?? [])
    const chosen: string[] = []
    const chosenSet = new Set<string>()

    const creditOk = (protein: string | null): boolean => {
      if (!protein) return true
      const allow = allowByProtein.get(protein)
      if (allow === undefined) return true
      return (used.get(protein) ?? 0) < allow
    }
    const consume = (protein: string | null) => {
      if (!protein) return
      used.set(protein, (used.get(protein) ?? 0) + 1)
    }
    const findReplacement = (): AutoFillRecipe | null => {
      for (const r of args.recipes) {
        if (chosenSet.has(r.id)) continue
        if (!passesRestrictions(r, restricted)) continue
        if (!creditOk(r.primary_protein_ingredient_id)) continue
        return r
      }
      return null
    }

    for (const rid of [...new Set(standard)].slice(0, Math.max(1, sub.mealsPerDay))) {
      const recipe = byId.get(rid)
      if (!recipe || chosenSet.has(rid)) {
        const rep = recipe ? null : findReplacement()
        if (rep) {
          chosen.push(rep.id)
          chosenSet.add(rep.id)
          consume(rep.primary_protein_ingredient_id)
          issues.push({ kind: "swapped-restriction", message: `Standard meal unavailable — used ${rep.name} instead.` })
        } else if (!recipe) {
          issues.push({ kind: "no-replacement", message: "A standard meal is no longer on the menu — pick manually." })
        }
        continue
      }
      if (!passesRestrictions(recipe, restricted)) {
        const rep = findReplacement()
        if (rep) {
          chosen.push(rep.id)
          chosenSet.add(rep.id)
          consume(rep.primary_protein_ingredient_id)
          issues.push({ kind: "swapped-restriction", message: `Restricted ingredient — swapped ${recipe.name} for ${rep.name}.` })
        } else {
          issues.push({ kind: "no-replacement", message: `No replacement found for restricted ${recipe.name} — pick manually.` })
        }
        continue
      }
      if (!creditOk(recipe.primary_protein_ingredient_id)) {
        const rep = findReplacement()
        if (rep) {
          chosen.push(rep.id)
          chosenSet.add(rep.id)
          consume(rep.primary_protein_ingredient_id)
          issues.push({ kind: "swapped-credit", message: `Protein credits out — swapped ${recipe.name} for ${rep.name}.` })
        } else {
          issues.push({ kind: "no-replacement", message: `Protein credits out for ${recipe.name}, no alternative — pick manually.` })
        }
        continue
      }
      chosen.push(rid)
      chosenSet.add(rid)
      consume(recipe.primary_protein_ingredient_id)
    }

    if (sub.remainingMeals !== null) {
      if (sub.remainingMeals <= 0) {
        return { subscriptionId: sub.id, customerName: sub.customerName, recipeIds: [], issues: [{ kind: "depleted", message: "No meals remaining on this subscription." }], skipped: false }
      }
      if (chosen.length > sub.remainingMeals) {
        const trimmed = chosen.splice(sub.remainingMeals)
        for (const t of trimmed) chosenSet.delete(t)
        issues.push({
          kind: "trimmed",
          message: `Only ${sub.remainingMeals} meal${sub.remainingMeals !== 1 ? "s" : ""} remaining on this subscription — trimmed, edit manually.`,
        })
      }
    }

    return { subscriptionId: sub.id, customerName: sub.customerName, recipeIds: chosen, issues, skipped: false }
  })
}
