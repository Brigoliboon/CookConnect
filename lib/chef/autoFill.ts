import type { ProteinAllowance } from "./credits"
import { BREAKFAST_CATEGORY, LOOKBACK_DAYS, addCalendarDays } from "./day"

export interface AutoFillRecipe {
  id: string
  name: string
  category: string | null
  primary_protein_ingredient_id: string | null
  servings: { ingredients?: { name: string }[] }[]
}

export interface AutoFillPick {
  recipe_id: string
  scheduled_date?: string
  counts_toward_entitlement?: boolean
}

export interface AutoFillSub {
  id: string
  customerName: string
  subscription_plan_id: string
  mealsPerDay: number
  /** 1 normally; 2 on Thursday when the sub also has Friday */
  dayMultiplier: number
  breakfastCount: number
  /** Thursday appearance only because Friday delivery moved */
  isFridayMoved: boolean
  /** lowercase restricted ingredient names */
  restrictedNames: string[]
  /** Flexible included meal recipe IDs; empty = Normal / chef's choice */
  preferredRecipeIds: string[]
  /** stored remaining_meal_count, null when unknown (no trim applied) */
  remainingMeals: number | null
}

export type AutoFillIssueKind =
  | "swapped-restriction"
  | "swapped-credit"
  | "swapped-repeat"
  | "swapped-preference"
  | "off-preference"
  | "trimmed"
  | "depleted"
  | "no-replacement"
  | "no-standard"
  | "no-friday-standard"
  | "suggested"
  | "skipped"

export interface AutoFillIssue {
  kind: AutoFillIssueKind
  message: string
}

export interface AutoFillResult {
  subscriptionId: string
  customerName: string
  recipeIds: string[]
  breakfastRecipeIds: string[]
  issues: AutoFillIssue[]
  skipped: boolean
}

export interface SuggestedStandard {
  planId: string
  mealsPerDay: number
  recipeIds: string[]
}

export interface AutoFillDayOutput {
  results: AutoFillResult[]
  suggestedStandards: SuggestedStandard[]
  suggestedFridayStandards: SuggestedStandard[]
}

function passesRestrictions(r: AutoFillRecipe, restricted: Set<string>): boolean {
  if (restricted.size === 0) return true
  return !(r.servings ?? []).some((s) =>
    (s.ingredients ?? []).some((ing) => restricted.has(ing.name.toLowerCase())),
  )
}

function isBreakfastRecipe(r: AutoFillRecipe): boolean {
  return (r.category ?? "").toLowerCase() === BREAKFAST_CATEGORY
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function groupHasDouble(subs: AutoFillSub[], planId: string, mealsPerDay: number): boolean {
  return subs.some(
    (s) => s.subscription_plan_id === planId && s.mealsPerDay === mealsPerDay && s.dayMultiplier > 1,
  )
}

export function autoFillDay(args: {
  date: string
  subs: AutoFillSub[]
  /** key `${planId}::${mealsPerDay}` -> ordered recipe ids of the day's standard */
  standards: Map<string, string[]>
  /** Friday cook set (stored on Friday's date), same key shape; used on Thursday doubles */
  fridayStandards?: Map<string, string[]>
  recipes: AutoFillRecipe[]
  /** already-saved picks for the date */
  existingBySub: Map<string, Set<string>>
  allowancesByPlan: Map<string, ProteinAllowance[]>
  /** ALL picks per subscription (whole period) for credit accounting + recency */
  allPicksBySub: Map<string, AutoFillPick[]>
  recipeProtein: Map<string, string | null>
}): AutoFillDayOutput {
  const byId = new Map(args.recipes.map((r) => [r.id, r]))
  const lookbackStart = addCalendarDays(args.date, -LOOKBACK_DAYS)

  const usedBySub = new Map<string, Map<string, number>>()
  for (const [subId, picks] of args.allPicksBySub) {
    const m = new Map<string, number>()
    for (const p of picks) {
      if (p.counts_toward_entitlement === false) continue
      const prot = args.recipeProtein.get(p.recipe_id)
      if (!prot) continue
      m.set(prot, (m.get(prot) ?? 0) + 1)
    }
    usedBySub.set(subId, m)
  }

  const cookList = new Set<string>()

  const globalLastServed = (recipeId: string): string => {
    let latest = "0000-00-00"
    for (const picks of args.allPicksBySub.values()) {
      for (const p of picks) {
        if (p.recipe_id !== recipeId || !p.scheduled_date) continue
        if (p.scheduled_date >= args.date) continue
        if (p.scheduled_date > latest) latest = p.scheduled_date
      }
    }
    return latest
  }

  const skipIds = new Set<string>()
  for (const sub of args.subs) {
    const existing = args.existingBySub.get(sub.id)
    if ((existing && existing.size > 0) || (sub.remainingMeals !== null && sub.remainingMeals <= 0)) {
      skipIds.add(sub.id)
    }
  }
  const eligible = args.subs.filter((s) => !skipIds.has(s.id))

  const creditOkFor = (sub: AutoFillSub, protein: string | null): boolean => {
    if (!protein) return true
    const allowances = args.allowancesByPlan.get(sub.subscription_plan_id) ?? []
    const row = allowances.find((a) => a.ingredient_id === protein)
    if (!row) return true
    return (usedBySub.get(sub.id)?.get(protein) ?? 0) < row.allowance
  }

  const isRecent = (subId: string, recipeId: string, mealsPerDay: number): boolean => {
    const picks = args.allPicksBySub.get(subId) ?? []
    for (const p of picks) {
      if (p.recipe_id !== recipeId || !p.scheduled_date) continue
      if (p.scheduled_date >= args.date) continue
      if (p.scheduled_date >= lookbackStart) return true
    }
    const lastN = [...picks]
      .filter((p) => p.counts_toward_entitlement !== false && (p.scheduled_date ?? "") < args.date)
      .sort((a, b) => (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? ""))
      .slice(0, Math.max(1, mealsPerDay) * 3)
    return lastN.some((p) => p.recipe_id === recipeId)
  }

  const canEat = (sub: AutoFillSub, r: AutoFillRecipe, avoidRecent: boolean): boolean => {
    const restricted = new Set(sub.restrictedNames.map((n) => n.toLowerCase()))
    if (!passesRestrictions(r, restricted)) return false
    if (!creditOkFor(sub, r.primary_protein_ingredient_id)) return false
    if (avoidRecent && isRecent(sub.id, r.id, sub.mealsPerDay)) return false
    return true
  }

  const coverage = (r: AutoFillRecipe, breakfast: boolean): number => {
    let n = 0
    for (const s of eligible) {
      if (breakfast && s.breakfastCount <= 0) continue
      if (canEat(s, r, true)) n += 1
    }
    return n
  }

  const preferenceHits = (r: AutoFillRecipe, breakfast: boolean): number => {
    let n = 0
    for (const s of eligible) {
      if (breakfast && s.breakfastCount <= 0) continue
      if (s.preferredRecipeIds.length === 0) continue
      if (!s.preferredRecipeIds.includes(r.id)) continue
      if (!canEat(s, r, true)) continue
      n += 1
    }
    return n
  }

  const pickPack = (count: number, breakfast: boolean): string[] => {
    const chosen: AutoFillRecipe[] = []
    const taken = new Set<string>()
    const voters = breakfast ? eligible.filter((s) => s.breakfastCount > 0).length : eligible.length
    while (chosen.length < count) {
      const cats = new Set(chosen.map((r) => (r.category ?? "").toLowerCase()).filter(Boolean))
      const proteins = new Set(
        chosen.map((r) => r.primary_protein_ingredient_id).filter((id): id is string => !!id),
      )
      const candidates = args.recipes.filter((r) => {
        if (taken.has(r.id)) return false
        return breakfast ? isBreakfastRecipe(r) : !isBreakfastRecipe(r)
      })
      if (candidates.length === 0) break
      candidates.sort((a, b) => {
        const cov = coverage(b, breakfast) - coverage(a, breakfast)
        if (cov !== 0) return cov
        const pref = preferenceHits(b, breakfast) - preferenceHits(a, breakfast)
        if (pref !== 0) return pref
        const da = globalLastServed(a.id)
        const db = globalLastServed(b.id)
        if (da !== db) return da.localeCompare(db)
        const div = (r: AutoFillRecipe) =>
          (cats.has((r.category ?? "").toLowerCase()) ? 0 : 1) +
          (r.primary_protein_ingredient_id && proteins.has(r.primary_protein_ingredient_id) ? 0 : 1)
        const ddiv = div(b) - div(a)
        if (ddiv !== 0) return ddiv
        return a.name.localeCompare(b.name)
      })
      const pick = candidates[0]
      if (voters > 0 && coverage(pick, breakfast) === 0 && chosen.length > 0) {
        // keep filling so larger meal counts still have a batch
      }
      chosen.push(pick)
      taken.add(pick.id)
      cookList.add(pick.id)
    }
    return chosen.map((r) => r.id)
  }

  const maxMain = Math.max(0, ...eligible.map((s) => Math.max(1, s.mealsPerDay) * Math.max(1, s.dayMultiplier)))
  const maxBf = Math.max(0, ...eligible.map((s) => s.breakfastCount))
  const dayPack = pickPack(maxMain, false)
  const dayBreakfast = maxBf > 0 ? pickPack(maxBf, true) : []

  const suggestedStandards: SuggestedStandard[] = []
  const suggestedFridayStandards: SuggestedStandard[] = []
  const seenKeys = new Set<string>()
  for (const sub of eligible) {
    const key = `${sub.subscription_plan_id}::${sub.mealsPerDay}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    suggestedStandards.push({
      planId: sub.subscription_plan_id,
      mealsPerDay: sub.mealsPerDay,
      recipeIds: dayPack.slice(0, sub.mealsPerDay),
    })
    if (groupHasDouble(eligible, sub.subscription_plan_id, sub.mealsPerDay)) {
      suggestedFridayStandards.push({
        planId: sub.subscription_plan_id,
        mealsPerDay: sub.mealsPerDay,
        recipeIds: dayPack.slice(sub.mealsPerDay, sub.mealsPerDay * 2),
      })
    }
  }

  const ordered = [...args.subs].sort(
    (a, b) => a.restrictedNames.length - b.restrictedNames.length || a.customerName.localeCompare(b.customerName),
  )
  const results = new Map<string, AutoFillResult>()

  for (const sub of ordered) {
    const existing = args.existingBySub.get(sub.id)
    if (existing && existing.size > 0) {
      results.set(sub.id, {
        subscriptionId: sub.id,
        customerName: sub.customerName,
        recipeIds: [],
        breakfastRecipeIds: [],
        issues: [],
        skipped: true,
      })
      continue
    }

    if (sub.remainingMeals !== null && sub.remainingMeals <= 0) {
      results.set(sub.id, {
        subscriptionId: sub.id,
        customerName: sub.customerName,
        recipeIds: [],
        breakfastRecipeIds: [],
        issues: [{ kind: "depleted", message: "No meals remaining on this subscription." }],
        skipped: false,
      })
      continue
    }

    const pack = dayPack
    const issues: AutoFillIssue[] = []
    if (pack.length === 0) {
      results.set(sub.id, {
        subscriptionId: sub.id,
        customerName: sub.customerName,
        recipeIds: [],
        breakfastRecipeIds: [],
        issues: [{ kind: "no-replacement", message: "No subscription meals available to recommend — check the included menu." }],
        skipped: false,
      })
      continue
    }
    const mainCount = Math.max(1, sub.mealsPerDay) * Math.max(1, sub.dayMultiplier)
    const breakfastCount = Math.max(0, sub.breakfastCount)
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

    const preferredForSlot = (breakfast: boolean): Set<string> | null => {
      if (sub.preferredRecipeIds.length === 0) return null
      const set = new Set<string>()
      for (const id of sub.preferredRecipeIds) {
        const r = byId.get(id)
        if (!r) {
          if (!breakfast) set.add(id)
          continue
        }
        const isBf = isBreakfastRecipe(r)
        if (breakfast ? isBf : !isBf) set.add(id)
      }
      return set.size > 0 ? set : null
    }

    const starvedOfPreferred = (prefSet: Set<string>, breakfast: boolean): boolean => {
      const picks = args.allPicksBySub.get(sub.id) ?? []
      for (const p of picks) {
        if (!prefSet.has(p.recipe_id) || !p.scheduled_date) continue
        if (p.scheduled_date >= args.date) continue
        if (breakfast && p.counts_toward_entitlement !== false) continue
        if (!breakfast && p.counts_toward_entitlement === false) continue
        if (p.scheduled_date >= lookbackStart) return false
      }
      const lastN = [...picks]
        .filter((p) => {
          if ((p.scheduled_date ?? "") >= args.date) return false
          if (breakfast) return p.counts_toward_entitlement === false
          return p.counts_toward_entitlement !== false
        })
        .sort((a, b) => (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? ""))
        .slice(0, Math.max(1, sub.mealsPerDay) * 3)
      return !lastN.some((p) => prefSet.has(p.recipe_id))
    }

    const findReplacement = (opts: {
      breakfast: boolean
      cookListOnly: boolean
      mustBePreferred?: boolean
      avoidRecent?: boolean
    }): AutoFillRecipe | null => {
      const prefSet = opts.mustBePreferred ? preferredForSlot(opts.breakfast) : null
      if (opts.mustBePreferred && !prefSet) return null
      const candidates = args.recipes.filter((r) => {
        if (chosenSet.has(r.id)) return false
        if (opts.breakfast ? !isBreakfastRecipe(r) : isBreakfastRecipe(r)) return false
        if (!passesRestrictions(r, restricted)) return false
        if (!creditOk(r.primary_protein_ingredient_id)) return false
        if (opts.cookListOnly && !cookList.has(r.id)) return false
        if (prefSet && !prefSet.has(r.id)) return false
        if (opts.avoidRecent && isRecent(sub.id, r.id, sub.mealsPerDay)) return false
        return true
      })
      if (candidates.length === 0) return null
      const onList = candidates.filter((r) => cookList.has(r.id))
      const pool = onList.length > 0 ? onList : candidates
      pool.sort((a, b) => {
        if (!opts.cookListOnly) {
          const da = globalLastServed(a.id)
          const db = globalLastServed(b.id)
          if (da !== db) return da.localeCompare(db)
        }
        return a.name.localeCompare(b.name)
      })
      return pool[0]
    }

    const replace = (
      reason: AutoFillIssueKind,
      message: string,
      breakfast: boolean,
    ): AutoFillRecipe | null => {
      const onList = findReplacement({ breakfast, cookListOnly: true })
      if (onList) {
        issues.push({ kind: reason, message: `${message} Stayed on today's cook list (${onList.name}).` })
        return onList
      }
      const expanded = findReplacement({ breakfast, cookListOnly: false })
      if (expanded) {
        issues.push({ kind: reason, message: `${message} Added ${expanded.name} to the cook list.` })
        return expanded
      }
      issues.push({ kind: "no-replacement", message: `${message} No replacement — pick manually.` })
      return null
    }

    const take = (recipe: AutoFillRecipe, asBreakfast = false) => {
      chosen.push(recipe.id)
      chosenSet.add(recipe.id)
      cookList.add(recipe.id)
      if (!asBreakfast) consume(recipe.primary_protein_ingredient_id)
    }

    const fillFromPool = (breakfast: boolean) => {
      const prefSet = preferredForSlot(breakfast)
      if (prefSet) {
        const preferredOnList = findReplacement({
          breakfast,
          cookListOnly: true,
          mustBePreferred: true,
          avoidRecent: true,
        })
        if (preferredOnList) {
          take(preferredOnList, breakfast)
          return
        }
        if (starvedOfPreferred(prefSet, breakfast)) {
          const preferredExpand = findReplacement({
            breakfast,
            cookListOnly: false,
            mustBePreferred: true,
            avoidRecent: true,
          })
          if (preferredExpand) {
            issues.push({
              kind: "swapped-preference",
              message: `Filled from preferred list. Added ${preferredExpand.name} to the cook list.`,
            })
            take(preferredExpand, breakfast)
            return
          }
        }
      }
      const onList = findReplacement({ breakfast, cookListOnly: true, avoidRecent: true })
        ?? findReplacement({ breakfast, cookListOnly: true })
      if (onList) {
        if (prefSet) {
          issues.push({
            kind: "off-preference",
            message: `Kept kitchen batch (${onList.name}) today — preferred meals continue on rotation.`,
          })
        }
        take(onList, breakfast)
        return
      }
      const expanded = findReplacement({ breakfast, cookListOnly: false })
      if (expanded) {
        take(expanded, breakfast)
        return
      }
      issues.push({
        kind: "no-replacement",
        message: breakfast ? "No breakfast meal available — pick manually." : "Could not fill an extra meal — pick manually.",
      })
    }

    const assignOne = (rid: string | undefined, breakfast: boolean) => {
      if (!rid) {
        fillFromPool(breakfast)
        return
      }
      const recipe = byId.get(rid)
      if (!recipe || chosenSet.has(recipe.id)) {
        const rep = replace(
          recipe ? "swapped-repeat" : "swapped-restriction",
          recipe ? `${recipe.name} was already assigned today.` : "Standard meal unavailable.",
          breakfast,
        )
        if (rep) take(rep, breakfast)
        return
      }
      if (!breakfast && isBreakfastRecipe(recipe)) {
        const rep = replace("swapped-restriction", `${recipe.name} is a breakfast item — swapped out of the main set.`, false)
        if (rep) take(rep, false)
        return
      }
      if (breakfast && !isBreakfastRecipe(recipe)) {
        const rep = replace("swapped-restriction", `${recipe.name} is not a breakfast item.`, true)
        if (rep) take(rep, true)
        return
      }
      if (!passesRestrictions(recipe, restricted)) {
        const rep = replace("swapped-restriction", `Restricted ingredient — swapped ${recipe.name}.`, breakfast)
        if (rep) take(rep, breakfast)
        return
      }
      if (!creditOk(recipe.primary_protein_ingredient_id)) {
        const rep = replace("swapped-credit", `Protein credits out — swapped ${recipe.name}.`, breakfast)
        if (rep) take(rep, breakfast)
        return
      }
      const prefSet = preferredForSlot(breakfast)
      if (prefSet && !prefSet.has(recipe.id)) {
        const onList = findReplacement({
          breakfast,
          cookListOnly: true,
          mustBePreferred: true,
          avoidRecent: true,
        })
        if (onList) {
          issues.push({
            kind: "swapped-preference",
            message: `${recipe.name} is off this customer's preferred list. Stayed on today's cook list (${onList.name}).`,
          })
          take(onList, breakfast)
          return
        }
        if (starvedOfPreferred(prefSet, breakfast)) {
          const expanded = findReplacement({
            breakfast,
            cookListOnly: false,
            mustBePreferred: true,
            avoidRecent: true,
          })
          if (expanded) {
            issues.push({
              kind: "swapped-preference",
              message: `${recipe.name} is off this customer's preferred list. Added ${expanded.name} to the cook list.`,
            })
            take(expanded, breakfast)
            return
          }
        }
        issues.push({
          kind: "off-preference",
          message: `Kept kitchen batch (${recipe.name}) today — preferred meals continue on rotation.`,
        })
      }
      if (isRecent(sub.id, recipe.id, sub.mealsPerDay)) {
        const alt = findReplacement({ breakfast, cookListOnly: true, avoidRecent: true })
        if (alt) {
          issues.push({
            kind: "swapped-repeat",
            message: `Recently served ${recipe.name} — used ${alt.name} already on today's cook list.`,
          })
          take(alt, breakfast)
          return
        }
      }
      take(recipe, breakfast)
    }

    const thursdaySet = pack.slice(0, sub.mealsPerDay)
    let fridaySet: string[] = []
    if (sub.dayMultiplier > 1) {
      fridaySet = pack.slice(sub.mealsPerDay, sub.mealsPerDay * 2)
    }

    const mainWanted = uniqueIds([...thursdaySet, ...fridaySet])
    for (let i = 0; i < mainCount; i++) assignOne(mainWanted[i], false)

    const mainIds = [...chosen]
    const bfPack = dayBreakfast
    for (let i = 0; i < breakfastCount; i++) assignOne(bfPack[i], true)
    const breakfastIds = chosen.slice(mainIds.length)

    if (sub.remainingMeals !== null) {
      if (mainIds.length > sub.remainingMeals) {
        const trimmed = mainIds.splice(sub.remainingMeals)
        for (const t of trimmed) chosenSet.delete(t)
        issues.push({
          kind: "trimmed",
          message: `Only ${sub.remainingMeals} meal${sub.remainingMeals !== 1 ? "s" : ""} remaining on this subscription — trimmed, edit manually.`,
        })
      }
    }

    usedBySub.set(sub.id, used)
    results.set(sub.id, {
      subscriptionId: sub.id,
      customerName: sub.customerName,
      recipeIds: mainIds,
      breakfastRecipeIds: breakfastIds,
      issues,
      skipped: false,
    })
  }

  return {
    results: args.subs.map(
      (sub) =>
        results.get(sub.id) ?? {
          subscriptionId: sub.id,
          customerName: sub.customerName,
          recipeIds: [],
          breakfastRecipeIds: [],
          issues: [],
          skipped: false,
        },
    ),
    suggestedStandards,
    suggestedFridayStandards,
  }
}
