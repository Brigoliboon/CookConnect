import {
  SUBSCRIPTION_ADDON_ITEMS,
  SUBSCRIPTION_ADDON_KEYS,
  subscriptionAddonKeyOfRecipe,
  type SubscriptionAddonKey,
} from "@/constants/subscription-addons"
import {
  recipePassesRestrictions,
  type RestrictionMatchInput,
  type RestrictionRecipe,
} from "@/lib/subscription/restrictions"
import type { AutoFillIssue } from "./autoFill"
import { LOOKBACK_DAYS, addCalendarDays } from "./day"

/** Same idea as the main-meal rule: a customer's last few add-ons of a type are "recent". */
export const ADDON_RECENT_PICKS = 3

const NEVER_SERVED = "0000-00-00"

export interface AddonPick {
  recipe_id: string
  scheduled_date?: string
}

export interface AddonSub {
  id: string
  /** add-on lists this subscription bought */
  keys: SubscriptionAddonKey[]
  restrictedIngredientIds: string[]
  restrictedCategories: string[]
}

export interface AddonSubResult {
  recipeIds: string[]
  issues: AutoFillIssue[]
}

function restrictionMatch(sub: AddonSub): RestrictionMatchInput {
  return {
    restrictedIngredientIds: sub.restrictedIngredientIds,
    restrictedCategories: sub.restrictedCategories,
  }
}

function restrictionWeight(sub: AddonSub): number {
  return sub.restrictedIngredientIds.length + sub.restrictedCategories.length
}

function keyLabel(key: SubscriptionAddonKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * Picks the drinks / cakes item each subscription gets today.
 *
 * Mirrors the variety checks the chef auto-fill uses for meals so add-ons never settle on one item:
 * - per customer: skip an item served in the last LOOKBACK_DAYS days or among their last few of that type
 * - across the kitchen: rotate by least recently served, so the list cycles instead of repeating
 * - one shared item per type per day (one batch to make), with restricted or recent customers
 *   moved onto an item already on today's list before anything new is added
 * - if every allowed item is recent, repeat the one that customer had the longest ago
 *
 * Add-ons already saved for today are kept as they are, so re-saving a day never re-rolls them.
 */
export function pickAddonsForDay(args: {
  date: string
  /** subscriptions that should get add-ons today */
  subs: AddonSub[]
  /** loaded recipe rows (with ingredients) for restriction checks; unknown recipes are allowed */
  recipes: Map<string, RestrictionRecipe>
  /** ALL picks per subscription (whole period); only dated rows before `date` count as history */
  allPicksBySub: Map<string, AddonPick[]>
  /** add-on recipe ids already saved today for a subscription */
  existingBySub?: Map<string, string[]>
  /** add-on recipe ids already on today's cook list from other subscriptions */
  cookedToday?: string[]
}): Map<string, AddonSubResult> {
  const lookbackStart = addCalendarDays(args.date, -LOOKBACK_DAYS)
  const out = new Map<string, AddonSubResult>()
  const covered = new Map<string, Set<SubscriptionAddonKey>>()

  for (const sub of args.subs) {
    const result: AddonSubResult = { recipeIds: [], issues: [] }
    const done = new Set<SubscriptionAddonKey>()
    for (const id of args.existingBySub?.get(sub.id) ?? []) {
      const key = subscriptionAddonKeyOfRecipe(id)
      if (!key || !sub.keys.includes(key) || done.has(key)) continue
      done.add(key)
      result.recipeIds.push(id)
    }
    out.set(sub.id, result)
    covered.set(sub.id, done)
  }

  for (const key of SUBSCRIPTION_ADDON_KEYS) {
    const items = SUBSCRIPTION_ADDON_ITEMS[key]
    const itemIds = items.map((item) => item.recipeId)
    const itemIdSet = new Set(itemIds)
    const nameOf = (id: string) => items.find((item) => item.recipeId === id)?.recipeName ?? id.slice(0, 8)

    const wanting = args.subs.filter((s) => s.keys.includes(key) && !covered.get(s.id)?.has(key))
    if (wanting.length === 0) continue

    const cooked = new Set<string>((args.cookedToday ?? []).filter((id) => itemIdSet.has(id)))
    for (const sub of args.subs) {
      for (const id of out.get(sub.id)?.recipeIds ?? []) if (itemIdSet.has(id)) cooked.add(id)
    }

    const pastPicksOf = (subId: string): AddonPick[] =>
      (args.allPicksBySub.get(subId) ?? []).filter(
        (p) => itemIdSet.has(p.recipe_id) && !!p.scheduled_date && p.scheduled_date < args.date,
      )

    const lastServedBy = (subId: string, recipeId: string): string => {
      let latest = NEVER_SERVED
      for (const p of pastPicksOf(subId)) {
        if (p.recipe_id === recipeId && p.scheduled_date! > latest) latest = p.scheduled_date!
      }
      return latest
    }

    const globalLastServed = (recipeId: string): string => {
      let latest = NEVER_SERVED
      for (const subId of args.allPicksBySub.keys()) {
        const served = lastServedBy(subId, recipeId)
        if (served > latest) latest = served
      }
      return latest
    }

    const isRecent = (subId: string, recipeId: string): boolean => {
      const picks = pastPicksOf(subId)
      if (picks.some((p) => p.recipe_id === recipeId && p.scheduled_date! >= lookbackStart)) return true
      const lastN = [...picks]
        .sort((a, b) => (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? ""))
        .slice(0, ADDON_RECENT_PICKS)
      return lastN.some((p) => p.recipe_id === recipeId)
    }

    const canEat = (sub: AddonSub, recipeId: string): boolean => {
      const recipe = args.recipes.get(recipeId)
      return recipe ? recipePassesRestrictions(recipe, restrictionMatch(sub)) : true
    }

    const coverage = (recipeId: string): number =>
      wanting.filter((s) => canEat(s, recipeId) && !isRecent(s.id, recipeId)).length

    const ranked = [...itemIds].sort((a, b) => {
      const cov = coverage(b) - coverage(a)
      if (cov !== 0) return cov
      const onListA = cooked.has(a) ? 1 : 0
      const onListB = cooked.has(b) ? 1 : 0
      if (onListA !== onListB) return onListB - onListA
      const da = globalLastServed(a)
      const db = globalLastServed(b)
      if (da !== db) return da.localeCompare(db)
      return nameOf(a).localeCompare(nameOf(b))
    })
    const dayItem = ranked[0]

    const ordered = [...wanting].sort(
      (a, b) => restrictionWeight(a) - restrictionWeight(b) || a.id.localeCompare(b.id),
    )

    for (const sub of ordered) {
      const result = out.get(sub.id)!

      if (canEat(sub, dayItem) && !isRecent(sub.id, dayItem)) {
        result.recipeIds.push(dayItem)
        cooked.add(dayItem)
        continue
      }

      const why = canEat(sub, dayItem)
        ? { kind: "swapped-repeat" as const, text: `${nameOf(dayItem)} was served recently` }
        : { kind: "swapped-restriction" as const, text: `${nameOf(dayItem)} doesn't fit this customer's restrictions` }

      const allowed = itemIds.filter((id) => canEat(sub, id))
      if (allowed.length === 0) {
        result.issues.push({
          kind: "no-replacement",
          message: `${keyLabel(key)} add-on: nothing on the ${key} list fits this customer's restrictions — pick manually.`,
        })
        continue
      }

      const byRotation = (a: string, b: string) => {
        const da = globalLastServed(a)
        const db = globalLastServed(b)
        if (da !== db) return da.localeCompare(db)
        return nameOf(a).localeCompare(nameOf(b))
      }

      const fresh = allowed.filter((id) => !isRecent(sub.id, id))
      const freshOnList = fresh.filter((id) => cooked.has(id)).sort(byRotation)
      if (freshOnList.length > 0) {
        const pick = freshOnList[0]
        result.recipeIds.push(pick)
        result.issues.push({
          kind: why.kind,
          message: `${keyLabel(key)} add-on: ${why.text} — used ${nameOf(pick)}, already on today's cook list.`,
        })
        continue
      }

      if (fresh.length > 0) {
        const pick = [...fresh].sort(byRotation)[0]
        result.recipeIds.push(pick)
        cooked.add(pick)
        result.issues.push({
          kind: why.kind,
          message: `${keyLabel(key)} add-on: ${why.text} — added ${nameOf(pick)} to the cook list.`,
        })
        continue
      }

      // Everything allowed was served recently: repeat the one this customer had the longest ago.
      const pick = [...allowed].sort((a, b) => {
        const la = lastServedBy(sub.id, a)
        const lb = lastServedBy(sub.id, b)
        if (la !== lb) return la.localeCompare(lb)
        const onListA = cooked.has(a) ? 0 : 1
        const onListB = cooked.has(b) ? 0 : 1
        if (onListA !== onListB) return onListA - onListB
        return byRotation(a, b)
      })[0]
      result.recipeIds.push(pick)
      cooked.add(pick)
      result.issues.push({
        kind: "swapped-repeat",
        message: `${keyLabel(key)} add-on: every ${key} item was served recently, so repeated ${nameOf(pick)} (the one served longest ago).`,
      })
    }
  }

  return out
}
