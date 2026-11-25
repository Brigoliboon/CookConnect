"use client"

import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { Button } from "@/components/ui"
import {
  avatarTone,
  foodTone,
  formatLongDate,
  formatMonthYear,
  initials,
  parseISODate,
  slotLabel,
  weekDates,
  weekdayShort,
} from "@/components/chef/helpers"
import { imageThumb } from "@/lib/images"
import { proteinBuckets, type ProteinAllowance } from "@/lib/chef/credits"
import { autoFillDay, type AutoFillResult, type SuggestedStandard } from "@/lib/chef/autoFill"
import { pickAddonsForDay, type AddonSub } from "@/lib/chef/addons"
import { matchesSearch } from "@/lib/chef/search"
import {
  recipePassesRestrictions,
  restrictionDisplayLabels,
  restrictionMatchFromDetails,
} from "@/lib/subscription/restrictions"
import {
  activeOn,
  addCalendarDays,
  addonKeys,
  assignmentNeed,
  planPickProgress,
  BREAKFAST_CATEGORY,
  deliverySlots,
  isDoubleThursday,
  isFridayDelivery,
  preferredRecipeIds,
  toISODate,
  weekdayOf,
} from "@/lib/chef/day"
import type { DailyStandard } from "@/lib/supabase/models"
import {
  SUBSCRIPTION_ADDON_ITEMS,
  SUBSCRIPTION_ADDON_KEYS,
} from "@/constants/subscription-addons"
import { CalendarDays, Check, ChefHat, ChevronDown, ChevronLeft, ChevronRight, Clock, CookingPot, Search, Sun, Sunrise, Sunset, TriangleAlert, Users, Utensils, UtensilsCrossed, X } from "lucide-react"

const RECIPE_PAGE = 100
const SUB_RECIPE_QS = "is_active=true&is_subscription_included=true"
const ADDON_RECIPE_IDS = SUBSCRIPTION_ADDON_KEYS.flatMap((key) =>
  SUBSCRIPTION_ADDON_ITEMS[key].map((item) => item.recipeId),
)
const ADDON_NAMES = new Map(
  SUBSCRIPTION_ADDON_KEYS.flatMap((key) =>
    SUBSCRIPTION_ADDON_ITEMS[key].map((item) => [item.recipeId, item.recipeName] as const),
  ),
)

interface SubRow {
  id: string
  customer_id: string | null
  subscription_plan_id: string
  status: string
  started_at: string
  expires_at: string
  paused_at: string | null
  details: Record<string, unknown> | null
  customer: { id: string; name: string; email: string } | null
  plan: { validity_days: number } | null
  remaining_meal_count: number | null
}

interface RecipeRow {
  id: string
  name: string
  category: string | null
  description: string | null
  image_path: string | null
  primary_protein_ingredient_id: string | null
  servings: { ingredients?: { id?: string | null; name: string }[] }[]
}

interface PickRow {
  id: string
  subscription_id: string
  recipe_id: string
  scheduled_date?: string
  done_at: string | null
  counts_toward_entitlement?: boolean
}

async function fetchAllSubRecipes(): Promise<RecipeRow[]> {
  const all: RecipeRow[] = []
  let offset = 0
  let total = Infinity
  while (all.length < total) {
    const res = await fetch(
      `/api/recipe?sort=name&include=ingredients&limit=${RECIPE_PAGE}&offset=${offset}&${SUB_RECIPE_QS}`,
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
    const rows = (data.data ?? []) as RecipeRow[]
    total = typeof data.total === "number" ? data.total : offset + rows.length
    all.push(...rows)
    if (rows.length < RECIPE_PAGE) break
    offset += RECIPE_PAGE
  }
  return all
}

async function fetchAddonRecipes(): Promise<RecipeRow[]> {
  if (ADDON_RECIPE_IDS.length === 0) return []
  const q = new URLSearchParams({
    ids: ADDON_RECIPE_IDS.join(","),
    limit: String(RECIPE_PAGE),
    include: "ingredients",
  })
  const res = await fetch(`/api/recipe?${q.toString()}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch add-on items")
  return (data.data ?? []) as RecipeRow[]
}

function toStandardsMap(rows: DailyStandard[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const st of [...rows].sort((a, b) => a.position - b.position)) {
    const key = `${st.subscription_plan_id}::${st.meals_per_day}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(st.recipe_id)
  }
  return map
}

function restrictionLabels(details: Record<string, unknown> | null): string[] {
  return restrictionDisplayLabels(details)
}

function customerName(sub: SubRow): string {
  const d = sub.details ?? {}
  return (d.name as string) || sub.customer?.name || "Customer"
}

type CookDishKind = "main" | "breakfast" | "addon"

interface CookDish {
  recipeId: string
  name: string
  image_path: string | null
  count: number
  kind: CookDishKind
}

function aggregateCookList(
  items: { recipeId: string; kind?: CookDishKind; breakfast?: boolean }[],
  recipeById: Map<string, RecipeRow>,
): CookDish[] {
  const map = new Map<string, CookDish>()
  for (const item of items) {
    const kind: CookDishKind = item.kind ?? (item.breakfast ? "breakfast" : "main")
    const key = `${kind}:${item.recipeId}`
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      continue
    }
    const recipe = recipeById.get(item.recipeId)
    map.set(key, {
      recipeId: item.recipeId,
      name: recipe?.name ?? item.recipeId.slice(0, 8),
      image_path: recipe?.image_path ?? null,
      count: 1,
      kind,
    })
  }
  const order: Record<CookDishKind, number> = { main: 0, breakfast: 1, addon: 2 }
  return [...map.values()].sort((a, b) => {
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind]
    return b.count - a.count
  })
}

function pickKind(pick: PickRow): CookDishKind {
  if (ADDON_RECIPE_IDS.includes(pick.recipe_id)) return "addon"
  return pick.counts_toward_entitlement === false ? "breakfast" : "main"
}

function addonSubFrom(sub: SubRow): AddonSub {
  const restrictions = restrictionMatchFromDetails(sub.details)
  return {
    id: sub.id,
    keys: addonKeys(sub.details),
    restrictedIngredientIds: restrictions.restrictedIngredientIds,
    restrictedCategories: restrictions.restrictedCategories,
  }
}

function addonIdsIn(picks: PickRow[], subscriptionId?: string): string[] {
  return picks
    .filter((p) => (!subscriptionId || p.subscription_id === subscriptionId) && ADDON_RECIPE_IDS.includes(p.recipe_id))
    .map((p) => p.recipe_id)
}

function CookListGrid({ dishes }: { dishes: CookDish[] }) {
  if (dishes.length === 0) return null
  return (
    // The review dialog is a 420px side drawer from md up, so the column count follows the dialog's
    // width (two columns only while it is a wide bottom sheet), not the viewport's.
    <div className="grid grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-y-0 md:grid-cols-1 md:divide-y">
      {dishes.map((d) => (
        <div
          key={`${d.kind}:${d.recipeId}`}
          className="flex items-center gap-3 bg-white py-3 sm:pr-6 md:pr-0"
        >
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
            {d.image_path ? (
              <Image src={imageThumb(d.image_path)} alt={d.name} fill unoptimized sizes="56px" className="object-cover" loading="lazy" />
            ) : (
              <div className="flex size-full items-center justify-center text-neutral-400"><ChefHat size={20} /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {d.kind === "breakfast" && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Breakfast</p>
            )}
            {d.kind === "addon" && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">Add-on</p>
            )}
            <p className="line-clamp-2 break-words text-base font-semibold text-neutral-900">{d.name}</p>
            <p className="mt-0.5 text-xs text-neutral-400">
              {d.count} portion{d.count !== 1 ? "s" : ""}
            </p>
          </div>
          <span className={`shrink-0 text-xl font-bold tabular-nums ${d.kind === "breakfast" ? "text-amber-800" : d.kind === "addon" ? "text-sky-800" : "text-neutral-900"}`}>
            {d.count}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function EmployeeChefPage() {
  const today = useMemo(() => toISODate(new Date()), [])
  const [tab, setTab] = useState<"schedule" | "today">("schedule")
  const [slotFilter, setSlotFilter] = useState<"morning" | "noon" | "evening">("morning")
  const [month, setMonth] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })
  const [selected, setSelected] = useState(today)
  const [subs, setSubs] = useState<SubRow[]>([])
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [picks, setPicks] = useState<PickRow[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [categoryQuery, setCategoryQuery] = useState("")
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>([""])
  const [mealsLoading, setMealsLoading] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [todayPicks, setTodayPicks] = useState<PickRow[]>([])
  const [creditAllowances, setCreditAllowances] = useState<ProteinAllowance[]>([])
  const [subAllPicks, setSubAllPicks] = useState<PickRow[]>([])
  const [review, setReview] = useState<AutoFillResult[] | null>(null)
  const [reviewStandards, setReviewStandards] = useState<SuggestedStandard[]>([])
  const [reviewFridayStandards, setReviewFridayStandards] = useState<SuggestedStandard[]>([])
  const [reviewAddons, setReviewAddons] = useState<Map<string, string[]>>(new Map())
  const [reviewSearch, setReviewSearch] = useState("")
  const [plateSearch, setPlateSearch] = useState("")
  const [autofilling, setAutofilling] = useState(false)
  const [applying, setApplying] = useState(false)
  const [doneBusy, setDoneBusy] = useState<Set<string>>(new Set())
  const [showAllUnpicked, setShowAllUnpicked] = useState(false)

  function fetchRecipes() {
    setMealsLoading(true)
    Promise.all([fetchAllSubRecipes(), fetchAddonRecipes()])
      .then(([rows, addonRows]) => {
        const merged = new Map([...rows, ...addonRows].map((r) => [r.id, r]))
        const all = [...merged.values()]
        setRecipes(all)
        const set = new Set(all.map((r) => r.category).filter(Boolean) as string[])
        setCategories(["", ...[...set].sort()])
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load meals"))
      .finally(() => setMealsLoading(false))
  }

  useEffect(() => {
    fetch("/api/subscriptions")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch subscriptions")
        return data as SubRow[]
      })
      .then(setSubs)
      .catch((e) => setError(e.message || "Failed to load subscriptions"))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecipes()
  }, [])

  useEffect(() => {
    fetch(`/api/chef-schedules?date=${selected}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch picks")
        return data as PickRow[]
      })
      .then(setPicks)
      .catch((e) => setError(e.message || "Failed to load picks"))
  }, [selected])

  useEffect(() => {
    if (tab !== "today") return
    fetch(`/api/chef-schedules?date=${today}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch today's picks")
        return data as PickRow[]
      })
      .then(setTodayPicks)
      .catch((e) => setError(e.message || "Failed to load today's picks"))
  }, [tab, today])

  const daySubs = useMemo(() => subs.filter((s) => activeOn(s, selected)), [subs, selected])

  /** Plates list after the subscriber search; the day's real set (daySubs) is untouched. */
  const visibleSubs = useMemo(
    () => daySubs.filter((s) => matchesSearch(plateSearch, [customerName(s), s.customer?.email])),
    [daySubs, plateSearch],
  )

  /** Meals + breakfast per customer for the selected day (add-on rows excluded), in saved order. */
  const planPicksBySub = useMemo(() => {
    const map = new Map<string, PickRow[]>()
    for (const p of picks) {
      if (ADDON_RECIPE_IDS.includes(p.recipe_id)) continue
      if (!map.has(p.subscription_id)) map.set(p.subscription_id, [])
      map.get(p.subscription_id)!.push(p)
    }
    return map
  }, [picks])

  const picksBySub = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const p of picks) {
      if (p.counts_toward_entitlement === false) continue
      if (!map.has(p.subscription_id)) map.set(p.subscription_id, new Set())
      map.get(p.subscription_id)!.add(p.recipe_id)
    }
    return map
  }, [picks])

  const recipeById = useMemo(() => {
    const map = new Map(recipes.map((r) => [r.id, r]))
    for (const [id, name] of ADDON_NAMES) {
      if (!map.has(id)) {
        map.set(id, {
          id,
          name,
          category: null,
          description: null,
          image_path: null,
          primary_protein_ingredient_id: null,
          servings: [],
        })
      }
    }
    return map
  }, [recipes])

  const dayBatch = useMemo(
    () =>
      aggregateCookList(
        picks.map((p) => ({ recipeId: p.recipe_id, kind: pickKind(p) })),
        recipeById,
      ),
    [picks, recipeById],
  )

  const reviewBatch = useMemo(() => {
    if (!review) return []
    return aggregateCookList(
      review.flatMap((r) =>
        r.skipped
          ? []
          : [
              ...r.recipeIds.map((recipeId) => ({ recipeId, kind: "main" as const })),
              ...r.breakfastRecipeIds.map((recipeId) => ({ recipeId, kind: "breakfast" as const })),
              ...(reviewAddons.get(r.subscriptionId) ?? []).map((recipeId) => ({ recipeId, kind: "addon" as const })),
            ],
      ),
      recipeById,
    )
  }, [review, recipeById, reviewAddons])

  const reviewReadyCount = review
    ? review.filter(
        (r) =>
          !r.skipped &&
          (r.recipeIds.length > 0 || r.breakfastRecipeIds.length > 0 || (reviewAddons.get(r.subscriptionId) ?? []).length > 0),
      ).length
    : 0

  /** Review dialog plates after its subscriber search. Only the list is filtered: Apply still saves the whole batch. */
  const visibleReview = useMemo(() => {
    if (!review) return []
    const byId = new Map(subs.map((s) => [s.id, s]))
    return review.filter((r) => matchesSearch(reviewSearch, [r.customerName, byId.get(r.subscriptionId)?.customer?.email]))
  }, [review, reviewSearch, subs])

  const recipeProtein = useMemo(
    () => new Map(recipes.map((r) => [r.id, r.primary_protein_ingredient_id])),
    [recipes],
  )

  const filteredTodayPicks = useMemo(() => {
    return todayPicks.filter((p) => {
      const sub = subs.find((s) => s.id === p.subscription_id)
      if (!sub) return true
      const slots = deliverySlots(sub.details)
      if (slots.length === 0) return true
      return slots.includes(slotFilter)
    })
  }, [todayPicks, subs, slotFilter])

  const todayByMeal = useMemo(() => {
    const map = new Map<string, { count: number; done: number; customers: string[]; pickIds: string[] }>()
    for (const p of filteredTodayPicks) {
      const entry = map.get(p.recipe_id) ?? { count: 0, done: 0, customers: [] as string[], pickIds: [] as string[] }
      entry.count += 1
      if (p.done_at) entry.done += 1
      entry.pickIds.push(p.id)
      const sub = subs.find((s) => s.id === p.subscription_id)
      if (sub) entry.customers.push(customerName(sub))
      map.set(p.recipe_id, entry)
    }
    return [...map.entries()]
      .map(([rid, v]) => ({ recipe: recipeById.get(rid) ?? null, recipeId: rid, ...v }))
      .sort((a, b) => b.count - a.count)
  }, [filteredTodayPicks, subs, recipeById])

  const todayCustomerIds = useMemo(() => new Set(filteredTodayPicks.map((p) => p.subscription_id)), [filteredTodayPicks])

  const todayUnpicked = useMemo(
    () =>
      subs.filter((s) => {
        if (!activeOn(s, today) || todayCustomerIds.has(s.id)) return false
        if (s.remaining_meal_count !== null && s.remaining_meal_count <= 0) return false
        const slots = deliverySlots(s.details)
        if (slots.length === 0) return true
        return slots.includes(slotFilter)
      }),
    [subs, today, todayCustomerIds, slotFilter],
  )

  const activeSub = expanded ? (daySubs.find((s) => s.id === expanded) ?? null) : null
  const activeDetails = (activeSub?.details ?? {}) as Record<string, unknown>
  const activeNeed = activeSub ? assignmentNeed(activeSub, selected) : null
  const activeTarget = activeNeed?.totalCount ?? 0
  const activeMainTarget = activeNeed?.mainCount ?? 0
  const activeBreakfastCount = activeNeed?.breakfastCount ?? 0
  const activeBreakfast = activeBreakfastCount > 0
  const activeBuckets = activeSub ? proteinBuckets(creditAllowances, recipeProtein, subAllPicks) : []
  const activeUsedTotal = activeBuckets.reduce((s, b) => s + b.used, 0)
  const activeAllowanceTotal = activeBuckets.reduce((s, b) => s + b.allowance, 0)
  const activeRestricted = activeSub ? restrictionLabels(activeSub.details) : []
  const activePreferred = activeSub ? new Set(preferredRecipeIds(activeSub.details)) : new Set<string>()
  const activeRemaining = activeSub?.remaining_meal_count ?? null
  const draftBreakfastCount = draft.filter(
    (id) => (recipeById.get(id)?.category ?? "").toLowerCase() === BREAKFAST_CATEGORY,
  ).slice(0, activeBreakfastCount).length
  const draftMainCount = draft.length - draftBreakfastCount
  const activeEntitlementPicked = activeSub
    ? picks.filter((p) => p.subscription_id === activeSub.id && p.counts_toward_entitlement !== false).length
    : 0
  const projectedRemaining =
    activeRemaining !== null ? activeRemaining + activeEntitlementPicked - draftMainCount : null

  function openPicker(subId: string, preset?: string[]) {
    setExpanded(subId)
    setDraft(preset ?? (planPicksBySub.get(subId) ?? []).map((p) => p.recipe_id))
    setSearch("")
    setCategory("")
    setCategoryQuery("")
    setCategoryOpen(false)
    setShowHidden(false)
    setCreditAllowances([])
    setSubAllPicks([])
    fetchRecipes()
    const sub = subs.find((s) => s.id === subId)
    if (sub?.subscription_plan_id) {
      fetch(`/api/plan-protein-credits?plan_id=${sub.subscription_plan_id}`)
        .then((r) => r.json())
        .then((d) => setCreditAllowances(Array.isArray(d) ? d : []))
        .catch(() => {})
    }
    fetch(`/api/chef-schedules?subscription_id=${subId}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch history")
        return data as PickRow[]
      })
      .then(setSubAllPicks)
      .catch(() => {})
  }

  function selectCategory(c: string) {
    setCategory(c)
  }

  function chooseCategory(c: string) {
    selectCategory(c)
    setCategoryQuery("")
    setCategoryOpen(false)
  }

  const categoryMatches = categories.filter(
    (c) => c && c.toLowerCase().includes(categoryQuery.trim().toLowerCase()),
  )

  function hiddenByRestriction(sub: SubRow): RecipeRow[] {
    const match = restrictionMatchFromDetails(sub.details)
    if (match.restrictedIngredientIds.length === 0 && match.restrictedCategories.length === 0) return []
    return recipes.filter((m) => !recipePassesRestrictions(m, match))
  }

  function mealsFor(sub: SubRow): RecipeRow[] {
    const match = restrictionMatchFromDetails(sub.details)
    let list = recipes
    if (category) list = list.filter((m) => m.category === category)
    if (match.restrictedIngredientIds.length > 0 || match.restrictedCategories.length > 0) {
      list = list.filter((m) => recipePassesRestrictions(m, match))
    }
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((m) => m.name.toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q))
    return list
  }

  function splitDraft(ids: string[], breakfastCount: number): { recipeIds: string[]; breakfastRecipeIds: string[] } {
    const breakfastRecipeIds: string[] = []
    const recipeIds: string[] = []
    for (const id of ids) {
      const isBf = (recipeById.get(id)?.category ?? "").toLowerCase() === BREAKFAST_CATEGORY
      if (isBf && breakfastRecipeIds.length < breakfastCount) breakfastRecipeIds.push(id)
      else recipeIds.push(id)
    }
    return { recipeIds, breakfastRecipeIds }
  }

  /** Add-ons for one subscription on the selected day: keeps what is saved, rotates otherwise. */
  function addonIdsFor(sub: SubRow): string[] {
    const addonSub = addonSubFrom(sub)
    if (addonSub.keys.length === 0) return []
    const out = pickAddonsForDay({
      date: selected,
      subs: [addonSub],
      recipes: recipeById,
      allPicksBySub: new Map([[sub.id, subAllPicks]]),
      existingBySub: new Map([[sub.id, addonIdsIn(picks, sub.id)]]),
      cookedToday: addonIdsIn(picks),
    })
    return out.get(sub.id)?.recipeIds ?? []
  }

  async function save(subId: string) {
    setSaving(true)
    setError("")
    try {
      const sub = subs.find((s) => s.id === subId)
      const breakfastCount = sub ? assignmentNeed(sub, selected).breakfastCount : 0
      const addonIds = sub ? addonIdsFor(sub) : []
      const { recipeIds, breakfastRecipeIds } = splitDraft(draft, breakfastCount)
      const res = await fetch("/api/chef-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_date: selected,
          subscription_id: subId,
          recipe_ids: recipeIds,
          breakfast_recipe_ids: breakfastRecipeIds,
          addon_recipe_ids: addonIds,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to save")
      }
      const data = (await res.json()) as PickRow[]
      const entitlementOf = (rows: PickRow[]) =>
        rows.filter((p) => p.subscription_id === subId && p.counts_toward_entitlement !== false).length
      const prevCount = entitlementOf(picks)
      setPicks((prev) => [...prev.filter((p) => p.subscription_id !== subId), ...data])
      if (selected === today) {
        setTodayPicks((prev) => [...prev.filter((p) => p.subscription_id !== subId), ...data])
      }
      setSubs((prev) =>
        prev.map((s) =>
          s.id === subId && s.remaining_meal_count !== null
            ? { ...s, remaining_meal_count: s.remaining_meal_count + (prevCount - entitlementOf(data)) }
            : s,
        ),
      )
      setExpanded(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function runAutoFill() {
    if (daySubs.length === 0) return
    setAutofilling(true)
    setError("")
    try {
      const fridayIso = weekdayOf(selected) === "thursday" ? addCalendarDays(selected, 1) : null
      const [pool, standardsRes, fridayRes, picksRes, creditsRes, addonRows] = await Promise.all([
        fetchAllSubRecipes(),
        fetch(`/api/daily-standards?date=${selected}`).then((r) => r.json()),
        fridayIso ? fetch(`/api/daily-standards?date=${fridayIso}`).then((r) => r.json()) : Promise.resolve([]),
        fetch(`/api/chef-schedules?subscription_ids=${daySubs.map((s) => s.id).join(",")}`).then((r) => r.json()),
        fetch("/api/plan-protein-credits").then((r) => r.json()),
        fetchAddonRecipes(),
      ])
      if (!Array.isArray(pool)) throw new Error("Failed to load meals")
      const allRecipes = [...new Map([...pool, ...addonRows].map((r) => [r.id, r])).values()]
      setRecipes(allRecipes)
      setCategories(["", ...[...new Set(allRecipes.map((r) => r.category).filter(Boolean) as string[])].sort()])
      const standards: DailyStandard[] = Array.isArray(standardsRes) ? standardsRes : []
      const fridayRows: DailyStandard[] = Array.isArray(fridayRes) ? fridayRes : []
      const allPicks = (Array.isArray(picksRes) ? picksRes : []) as PickRow[]
      const allPicksBySub = new Map<string, PickRow[]>()
      for (const p of allPicks) {
        if (!allPicksBySub.has(p.subscription_id)) allPicksBySub.set(p.subscription_id, [])
        allPicksBySub.get(p.subscription_id)!.push(p)
      }
      const allowancesByPlan = new Map<string, ProteinAllowance[]>()
      for (const c of (Array.isArray(creditsRes) ? creditsRes : []) as (ProteinAllowance & { subscription_plan_id: string })[]) {
        if (!allowancesByPlan.has(c.subscription_plan_id)) allowancesByPlan.set(c.subscription_plan_id, [])
        allowancesByPlan.get(c.subscription_plan_id)!.push(c)
      }
      const poolProtein = new Map(pool.map((r) => [r.id, r.primary_protein_ingredient_id]))
      const output = autoFillDay({
        date: selected,
        subs: daySubs.map((s) => {
          const need = assignmentNeed(s, selected)
          const restrictions = restrictionMatchFromDetails(s.details)
          return {
            id: s.id,
            customerName: customerName(s),
            subscription_plan_id: s.subscription_plan_id,
            mealsPerDay: need.mealsPerDay,
            dayMultiplier: need.dayMultiplier,
            breakfastCount: need.breakfastCount,
            isFridayMoved: need.isFridayMoved,
            restrictedIngredientIds: restrictions.restrictedIngredientIds,
            restrictedCategories: restrictions.restrictedCategories,
            preferredRecipeIds: preferredRecipeIds(s.details),
            remainingMeals: s.remaining_meal_count,
          }
        }),
        standards: toStandardsMap(standards),
        fridayStandards: toStandardsMap(fridayRows),
        recipes: pool,
        existingBySub: picksBySub,
        allowancesByPlan,
        allPicksBySub,
        recipeProtein: poolProtein,
      })
      const recipeRows = new Map(allRecipes.map((r) => [r.id, r]))
      const addonSubs = output.results.flatMap((r) => {
        const sub = r.skipped ? undefined : daySubs.find((s) => s.id === r.subscriptionId)
        const addonSub = sub ? addonSubFrom(sub) : null
        return addonSub && addonSub.keys.length > 0 ? [addonSub] : []
      })
      const addonOutput = pickAddonsForDay({
        date: selected,
        subs: addonSubs,
        recipes: recipeRows,
        allPicksBySub,
        existingBySub: new Map(addonSubs.map((s) => [s.id, addonIdsIn(picks, s.id)])),
        cookedToday: addonIdsIn(picks),
      })
      setReviewAddons(new Map([...addonOutput].map(([id, r]) => [id, r.recipeIds])))
      setReviewSearch("")
      setReview(
        output.results.map((r) => {
          const issues = addonOutput.get(r.subscriptionId)?.issues ?? []
          return issues.length > 0 ? { ...r, issues: [...r.issues, ...issues] } : r
        }),
      )
      setReviewStandards(output.suggestedStandards)
      setReviewFridayStandards(output.suggestedFridayStandards)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auto-fill failed")
    } finally {
      setAutofilling(false)
    }
  }

  async function setPicksDone(ids: string[], done: boolean) {
    if (ids.length === 0) return
    setDoneBusy((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    setError("")
    try {
      const updated = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch("/api/chef-schedules", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, done }),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error ?? "Failed to update")
          }
          return (await res.json()) as PickRow
        }),
      )
      const byId = new Map(updated.map((u) => [u.id, u]))
      const merge = (prev: PickRow[]) => prev.map((p) => byId.get(p.id) ?? p)
      setTodayPicks(merge)
      setPicks(merge)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setDoneBusy((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  async function confirmApply() {
    if (!review) return
    const assignments = review
      .filter(
        (r) =>
          !r.skipped &&
          (r.recipeIds.length > 0 || r.breakfastRecipeIds.length > 0 || (reviewAddons.get(r.subscriptionId) ?? []).length > 0),
      )
      .map((r) => ({
        subscription_id: r.subscriptionId,
        recipe_ids: r.recipeIds,
        breakfast_recipe_ids: r.breakfastRecipeIds,
        addon_recipe_ids: reviewAddons.get(r.subscriptionId) ?? [],
      }))
    if (assignments.length === 0) {
      setReview(null)
      return
    }
    setApplying(true)
    setError("")
    try {
      const fridayIso = weekdayOf(selected) === "thursday" ? addCalendarDays(selected, 1) : null
      await Promise.all(
        reviewStandards.map((st) =>
          fetch("/api/daily-standards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              standard_date: selected,
              subscription_plan_id: st.planId,
              meals_per_day: st.mealsPerDay,
              recipe_ids: st.recipeIds,
            }),
          }),
        ),
      )
      if (fridayIso) {
        await Promise.all(
          reviewFridayStandards.map((st) =>
            fetch("/api/daily-standards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                standard_date: fridayIso,
                subscription_plan_id: st.planId,
                meals_per_day: st.mealsPerDay,
                recipe_ids: st.recipeIds,
              }),
            }),
          ),
        )
      }
      const res = await fetch("/api/chef-schedules/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: selected, assignments }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to apply")
      }
      const data = (await res.json()) as PickRow[]
      const ids = new Set(assignments.map((a) => a.subscription_id))
      const countEntitlement = (rows: PickRow[], subId: string) =>
        rows.filter((p) => p.subscription_id === subId && p.counts_toward_entitlement !== false).length
      setPicks((prev) => [...prev.filter((p) => !ids.has(p.subscription_id)), ...data])
      if (selected === today) {
        setTodayPicks((prev) => [...prev.filter((p) => !ids.has(p.subscription_id)), ...data])
      }
      setSubs((prev) =>
        prev.map((s) => {
          if (!ids.has(s.id) || s.remaining_meal_count === null) return s
          const delta = countEntitlement(picks, s.id) - countEntitlement(data, s.id)
          return { ...s, remaining_meal_count: s.remaining_meal_count + delta }
        }),
      )
      setReview(null)
      setReviewStandards([])
      setReviewFridayStandards([])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply")
    } finally {
      setApplying(false)
    }
  }

  const week = weekDates(selected)

  function selectDate(iso: string) {
    setSelected(iso)
    const date = parseISODate(iso)
    setMonth({ y: date.getFullYear(), m: date.getMonth() })
  }

  function shiftWeek(delta: number) {
    selectDate(addCalendarDays(selected, delta * 7))
  }

  function onMonthChange(value: string) {
    if (!value) return
    const [year, monthNumber] = value.split("-").map(Number)
    const currentDay = parseISODate(selected).getDate()
    const lastDay = new Date(year, monthNumber, 0).getDate()
    selectDate(toISODate(new Date(year, monthNumber - 1, Math.min(currentDay, lastDay))))
  }

  const unpickedVisible = showAllUnpicked ? todayUnpicked : todayUnpicked.slice(0, 5)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[#0F172A] md:text-2xl">
            <ChefHat size={22} className="text-[#475569]" />
            Chef
          </h1>
          <p className="mt-2 text-sm text-[#475569] md:text-base">
            {tab === "today" ? "Today's cook list, by time of day" : "Pick a day, suggest meals, review, then apply"}
          </p>
        </div>
        <div className="flex rounded-full bg-[#F1F5F9] p-1" role="tablist" aria-label="Chef views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "schedule"}
            onClick={() => setTab("schedule")}
            className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm whitespace-nowrap transition-colors md:flex-none ${
              tab === "schedule" ? "bg-[#1E293B] font-semibold text-[#F8FAFC]" : "font-medium text-[#475569]"
            }`}
          >
            <CalendarDays size={16} />
            Schedule
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "today"}
            onClick={() => setTab("today")}
            className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm whitespace-nowrap transition-colors md:flex-none ${
              tab === "today" ? "bg-[#1E293B] font-semibold text-[#F8FAFC]" : "font-medium text-[#475569]"
            }`}
          >
            <UtensilsCrossed size={16} />
            To Cook Today
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {tab === "schedule" ? (
        <>
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <button type="button" aria-label="Previous week" onClick={() => shiftWeek(-1)} className="flex size-11 items-center justify-center rounded-xl text-[#475569] transition-colors hover:bg-[#F1F5F9]">
                <ChevronLeft size={20} />
              </button>
              <label className="relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 font-semibold text-[#0F172A] hover:bg-[#F1F5F9]">
                <CalendarDays size={18} className="text-[#475569]" />
                <span>{formatMonthYear(selected)}</span>
                <ChevronDown size={16} className="text-[#475569]" />
                <input
                  type="month"
                  aria-label="Open full calendar"
                  value={`${month.y}-${String(month.m + 1).padStart(2, "0")}`}
                  onChange={(event) => onMonthChange(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => selectDate(today)}
                className="h-11 rounded-full bg-[#F1F5F9] px-3.5 text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#E2E8F0]"
              >
                Today
              </button>
              <button type="button" aria-label="Next week" onClick={() => shiftWeek(1)} className="flex size-11 items-center justify-center rounded-xl text-[#475569] transition-colors hover:bg-[#F1F5F9]">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex gap-1.5 md:gap-2">
              {week.map((iso) => {
                const selectedDay = iso === selected
                const isToday = iso === today
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-pressed={selectedDay}
                    aria-label={`${weekdayShort(iso)} ${parseISODate(iso).getDate()}${isToday ? ", today" : ""}${selectedDay ? ", selected" : ""}`}
                    onClick={() => selectDate(iso)}
                    className={`flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-xl border py-1 ${
                      selectedDay
                        ? "border-[#DCFCE7] bg-[#DCFCE7] text-[#14532D]"
                        : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="text-[11px] font-medium leading-none">{weekdayShort(iso)}</span>
                    <span className="mt-1 text-base font-semibold leading-none tabular-nums">{parseISODate(iso).getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] md:flex-row md:items-center md:justify-between md:p-5">
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight text-[#0F172A]">{formatLongDate(selected)}</p>
              <p className="mt-1.5 flex items-center gap-2 text-[15px] text-[#475569]">
                <Users size={16} />
                {daySubs.length} customer{daySubs.length !== 1 ? "s" : ""} scheduled
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-[#475569]">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#334155]">1</span>
                Suggest
                <ChevronRight size={14} className="text-[#CBD5E1]" />
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#334155]">2</span>
                Review
                <ChevronRight size={14} className="text-[#CBD5E1]" />
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#334155]">3</span>
                Apply
              </p>
            </div>
            <button
              type="button"
              onClick={runAutoFill}
              disabled={autofilling || daySubs.length === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-5 text-base font-semibold text-white transition-colors hover:bg-[#166534] disabled:opacity-50"
            >
              <Utensils size={18} />
              {autofilling ? "Suggesting..." : dayBatch.length > 0 ? "Resuggest" : "Suggest meals"}
            </button>
          </div>

          {daySubs.length === 0 ? (
            <p className="text-sm text-[#475569]">
              {weekdayOf(selected) === "friday"
                ? "Closed on Fridays — Friday deliveries are prepared Thursday."
                : "No subscribed customers for this day."}
            </p>
          ) : (
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#475569] uppercase">
                <Utensils size={16} />
                Plates
              </h2>
              <p className="mt-1 mb-3 text-sm text-[#475569]">
                Each customer gets a slice of the batch. Edit only when a plate needs a swap.
              </p>
              <div className="relative mb-3 md:max-w-sm">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value)}
                  placeholder="Search subscribers..."
                  aria-label="Search subscribers"
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-10 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0F172A]"
                />
                {plateSearch && (
                  <button
                    type="button"
                    onClick={() => setPlateSearch("")}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]">
                {visibleSubs.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-[#475569]">
                    No subscribers match &ldquo;{plateSearch.trim()}&rdquo;.
                  </p>
                )}
                {visibleSubs.map((sub) => {
                  const details = (sub.details ?? {}) as Record<string, unknown>
                  const need = assignmentNeed(sub, selected)
                  const { picked: done, target, over, complete } = planPickProgress(planPicksBySub.get(sub.id) ?? [], need)
                  const restrictions = restrictionLabels(sub.details)
                  const remaining = sub.remaining_meal_count ?? null
                  const depleted = remaining !== null && remaining <= 0
                  const name = customerName(sub)
                  const tone = avatarTone(sub.id)
                  const planName = (details.planName as string) ?? (sub.plan?.validity_days ? `${sub.plan.validity_days}-Day Meal Plan` : "Subscription")
                  const extras = [
                    preferredRecipeIds(sub.details).length > 0 ? "flexible" : "",
                    need.breakfastCount > 0 ? "breakfast extra" : "",
                    details.drinks === true ? "drinks add-on" : "",
                    details.cakes === true ? "cakes add-on" : "",
                    isDoubleThursday(sub, selected) ? "Thu+Fri" : isFridayDelivery(sub, selected) ? "Fri on Thu" : "",
                  ].filter(Boolean)
                  return (
                    <div key={sub.id} className={`flex items-center gap-3 border-t border-[#F1F5F9] px-3 py-2 first:border-t-0 md:min-h-16 md:px-4 ${depleted ? "opacity-60" : ""}`}>
                      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tone.bg} ${tone.text}`}>
                        {initials(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-[#0F172A]">{name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#475569]">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={12} />
                            {planName}
                          </span>
                          {need.mealsPerDay > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Utensils size={12} />
                              {need.mealsPerDay}/day
                            </span>
                          )}
                          {remaining !== null && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              {remaining} left
                            </span>
                          )}
                          {extras.map((extra) => (
                            <span key={extra} className="text-[#64748B]">{extra}</span>
                          ))}
                          {restrictions.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 font-medium text-[#92400E]">
                              <TriangleAlert size={12} />
                              Avoids: {restrictions.slice(0, 2).join(", ")}
                              {restrictions.length > 2 ? ` +${restrictions.length - 2}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        title={over > 0 ? `${over} over the plan allowance (chef override)` : undefined}
                        className={`inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold ${
                        depleted ? "bg-[#E2E8F0] text-[#64748B]"
                        : over > 0 ? "bg-[#E0F2FE] text-[#075985]"
                        : complete ? "bg-[#DCFCE7] text-[#14532D]"
                        : done > 0 ? "bg-[#FEF3C7] text-[#92400E]"
                        : "bg-[#F1F5F9] text-[#334155]"
                      }`}>
                        {depleted ? "Depleted" : target > 0 ? `${done}/${target} set` : done > 0 ? `${done} set` : "0 set"}
                      </span>
                      <button
                        type="button"
                        onClick={() => openPicker(sub.id)}
                        disabled={depleted}
                        className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] px-4 text-sm font-semibold text-[#14532D] transition-colors hover:bg-[#BBF7D0] disabled:opacity-40"
                      >
                        {depleted ? "None" : done > 0 ? "Edit" : "Set"}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-[#475569]">
                <Users size={16} />
                {plateSearch.trim() ? `${visibleSubs.length} of ${daySubs.length}` : daySubs.length} plate{daySubs.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2 md:gap-3">
            {[
              { label: "Portions", value: filteredTodayPicks.length, icon: UtensilsCrossed },
              { label: "Meals", value: todayByMeal.length, icon: Utensils },
              { label: "Customers", value: todayCustomerIds.size, icon: Users },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-[#E2E8F0] bg-white px-2 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:px-4 md:py-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#475569] uppercase">
                    <Icon size={14} />
                    {stat.label}
                  </p>
                  <p className="mt-1.5 text-xl font-semibold tracking-tight text-[#0F172A] tabular-nums md:text-[28px] md:leading-none">{stat.value}</p>
                </div>
              )
            })}
          </div>

          <div className="mb-4 flex rounded-full bg-[#F1F5F9] p-1" role="tablist" aria-label="Time of day">
            {([
              { id: "morning", icon: Sunrise },
              { id: "noon", icon: Sun },
              { id: "evening", icon: Sunset },
            ] as const).map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={slotFilter === id}
                onClick={() => {
                  setSlotFilter(id)
                  setShowAllUnpicked(false)
                }}
                className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap transition-colors ${
                  slotFilter === id ? "bg-[#1E293B] font-semibold text-[#F8FAFC]" : "font-medium text-[#475569]"
                }`}
              >
                <Icon size={16} />
                {slotLabel(id)}
              </button>
            ))}
          </div>

          <div className={todayUnpicked.length > 0 ? "md:grid md:grid-cols-[1.2fr_0.8fr] md:items-start md:gap-4" : ""}>
            <div className="mb-6 md:mb-0">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#475569] uppercase">
                    <UtensilsCrossed size={16} />
                    Meals to cook
                  </h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {formatLongDate(today)} · {slotLabel(slotFilter)}
                  </p>
                </div>
                {filteredTodayPicks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allDone = filteredTodayPicks.every((p) => p.done_at)
                      void setPicksDone(filteredTodayPicks.map((p) => p.id), !allDone)
                    }}
                    disabled={filteredTodayPicks.some((p) => doneBusy.has(p.id))}
                    className="h-10 shrink-0 rounded-xl px-3 text-sm font-semibold text-[#166534] transition-colors hover:bg-[#DCFCE7] disabled:opacity-50"
                  >
                    {filteredTodayPicks.every((p) => p.done_at) ? "Reopen all" : "Mark all done"}
                  </button>
                )}
              </div>
              {todayByMeal.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]">
                  {todayByMeal.map(({ recipe, recipeId, count, done, customers, pickIds }) => {
                    const allDone = done >= count
                    const busy = pickIds.some((id) => doneBusy.has(id))
                    const tone = foodTone(recipe?.category)
                    return (
                      <div key={recipeId} className="flex items-center gap-3 border-t border-[#F1F5F9] px-3 py-2 first:border-t-0 md:min-h-14 md:px-4">
                        <div className={`relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ${tone.bg} ${tone.text}`}>
                          {recipe?.image_path ? (
                            <Image src={imageThumb(recipe.image_path)} alt={recipe.name} fill unoptimized sizes="48px" className="object-cover" loading="lazy" />
                          ) : (
                            <Utensils size={20} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-[#0F172A]">{recipe?.name ?? "Unknown meal"}</p>
                          {customers.length > 0 && (
                            <p className="truncate text-xs text-[#64748B]">{customers.join(", ")}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-base font-semibold tabular-nums text-[#0F172A]">×{count}</span>
                        <button
                          type="button"
                          onClick={() => void setPicksDone(pickIds, !allDone)}
                          disabled={busy}
                          aria-label={allDone ? "Reopen meal" : "Mark meal done"}
                          className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                            allDone ? "bg-[#DCFCE7] text-[#14532D]" : "bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
                          }`}
                        >
                          {busy ? (
                            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <>
                              <Check size={16} />
                              <span className="hidden sm:inline">{allDone ? "Done" : "Done"}</span>
                              {allDone || done === 0 ? null : <span className="text-xs font-medium opacity-80">{done}/{count}</span>}
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-4 py-8 text-center text-[#475569]">
                  <CookingPot size={36} className="text-[#94A3B8]" />
                  <p>Nothing scheduled to cook today</p>
                  <button
                    type="button"
                    onClick={() => setTab("schedule")}
                    className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-[#166534]"
                  >
                    <CalendarDays size={16} />
                    Open schedule
                  </button>
                </div>
              )}
            </div>

            {todayUnpicked.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#475569] uppercase">
                  <Clock size={16} />
                  Still to pick ({todayUnpicked.length})
                </h2>
                <p className="mt-1 mb-3 text-sm text-[#64748B]">Customers without a plate for today</p>
                <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]">
                  {unpickedVisible.map((sub) => {
                    const name = customerName(sub)
                    const tone = avatarTone(sub.id)
                    return (
                      <div key={sub.id} className="flex items-center gap-3 border-t border-[#F1F5F9] px-3 py-2 first:border-t-0 md:min-h-14 md:px-4">
                        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tone.bg} ${tone.text}`}>
                          {initials(name)}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-base font-semibold text-[#0F172A]">{name}</p>
                        <button
                          type="button"
                          onClick={() => {
                            selectDate(today)
                            openPicker(sub.id)
                          }}
                          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] px-4 text-sm font-semibold text-[#14532D] hover:bg-[#BBF7D0]"
                        >
                          Set meals
                        </button>
                      </div>
                    )
                  })}
                  {todayUnpicked.length > 5 && !showAllUnpicked && (
                    <button
                      type="button"
                      onClick={() => setShowAllUnpicked(true)}
                      className="flex h-11 w-full items-center justify-center gap-1.5 text-sm font-semibold text-[#166534]"
                    >
                      Show all {todayUnpicked.length}
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {review && createPortal(
        <div className="fixed inset-0 z-[70]">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close review" onClick={() => setReview(null)} />
          <aside
            role="dialog"
            aria-label="Review batch"
            className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.16)] md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:max-h-none md:rounded-none md:rounded-l-2xl md:shadow-[-8px_0_32px_rgba(15,23,42,0.12)]"
          >
            <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-[#E2E8F0] md:hidden" />
            <div className="flex items-start justify-between gap-3 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#0F172A]">Review batch</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-[#475569]">
                  <CalendarDays size={16} />
                  {formatLongDate(selected)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-[#475569]">
                  <UtensilsCrossed size={16} />
                  {reviewBatch.length} dish{reviewBatch.length !== 1 ? "es" : ""} for {reviewReadyCount} of {review.length} customers
                </p>
              </div>
              <button
                onClick={() => setReview(null)}
                aria-label="Close review"
                className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-[#475569] uppercase"><Utensils size={16} />Cook these</h3>
                {reviewBatch.length > 0 ? (
                  <CookListGrid dishes={reviewBatch} />
                ) : (
                  <p className="text-sm text-neutral-500">Nothing new to apply — plates are already set or skipped.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Plates</p>
                <div className="relative mb-3">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Search subscribers..."
                    aria-label="Search subscribers in this batch"
                    autoComplete="off"
                    className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-neutral-900"
                  />
                  {reviewSearch && (
                    <button
                      type="button"
                      onClick={() => setReviewSearch("")}
                      aria-label="Clear search"
                      className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {reviewSearch.trim() && (
                  <p className="mb-2 text-xs text-neutral-500">
                    Showing {visibleReview.length} of {review.length} customers. Apply batch still saves all {reviewReadyCount}.
                  </p>
                )}
                <div className="divide-y divide-neutral-100">
                  {reviewSearch.trim() && visibleReview.length === 0 && (
                    <p className="py-4 text-center text-sm text-neutral-500">No customers match &ldquo;{reviewSearch.trim()}&rdquo;.</p>
                  )}
                  {visibleReview.map((r) => {
                    const notable = r.issues.filter((i) => i.kind !== "suggested" && i.kind !== "skipped")
                    const blocking = notable.filter((i) => i.kind === "no-replacement" || i.kind === "no-standard" || i.kind === "depleted")
                    const addonIds = reviewAddons.get(r.subscriptionId) ?? []
                    const dishIds = [...r.recipeIds, ...r.breakfastRecipeIds, ...addonIds]
                    return (
                      <div key={r.subscriptionId} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900">{r.customerName}</p>
                          {r.skipped ? (
                            <p className="mt-0.5 text-xs text-neutral-400">Already set — skipped</p>
                          ) : dishIds.length > 0 ? (
                            <p className="mt-0.5 truncate text-xs text-neutral-500">
                              {r.recipeIds.map((rid) => recipeById.get(rid)?.name ?? rid.slice(0, 8)).join(" · ")}
                              {r.breakfastRecipeIds.length > 0
                                ? ` · BF ${r.breakfastRecipeIds.map((rid) => recipeById.get(rid)?.name ?? rid.slice(0, 8)).join(", ")}`
                                : ""}
                              {addonIds.length > 0
                                ? ` · Add-ons ${addonIds.map((rid) => recipeById.get(rid)?.name ?? rid.slice(0, 8)).join(", ")}`
                                : ""}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-neutral-400">No meals suggested</p>
                          )}
                          {notable.length > 0 && (
                            <p className={`mt-0.5 text-xs font-medium ${blocking.length > 0 ? "text-red-600" : "text-amber-700"}`}>
                              {notable[0].message}
                              {notable.length > 1 ? ` · +${notable.length - 1}` : ""}
                            </p>
                          )}
                        </div>
                        {!r.skipped && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReview(null)
                              openPicker(r.subscriptionId, [...r.recipeIds, ...r.breakfastRecipeIds])
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-[#F1F5F9] bg-white px-4 py-3 md:px-6">
              <button
                type="button"
                onClick={confirmApply}
                disabled={applying || reviewReadyCount === 0}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#15803D] text-base font-semibold text-white hover:bg-[#166534] disabled:opacity-50"
              >
                <Check size={18} />
                {applying ? "Applying..." : `Apply batch (${reviewReadyCount})`}
              </button>
              <button type="button" onClick={() => setReview(null)} className="mt-1 h-12 w-full text-base font-medium text-[#334155]">
                Close
              </button>
            </div>
          </aside>
        </div>,
        document.body,
      )}

      {activeSub && createPortal(
        <div className="fixed inset-0 z-[70]">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close meal picker" onClick={() => setExpanded(null)} />
          <aside
            role="dialog"
            aria-label="Set meals"
            className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.16)] md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:max-h-none md:rounded-none md:rounded-l-2xl md:shadow-[-8px_0_32px_rgba(15,23,42,0.12)]"
          >
            <div className="mx-auto mt-2 h-1 w-12 shrink-0 rounded-full bg-[#E2E8F0] md:hidden" />
            <div className="flex items-start justify-between gap-3 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#0F172A]">{customerName(activeSub)}</h2>
                <p className="mt-1 text-sm text-[#475569]">
                  {formatLongDate(selected)}{activeTarget > 0 ? ` · plan covers ${activeTarget}` : ""}
                </p>
              </div>
              <button
                onClick={() => setExpanded(null)}
                aria-label="Close meal picker"
                className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-900 p-4 text-white">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Plan</p>
                  <p className="truncate text-sm font-bold">{(activeDetails.planName as string) ?? "Subscription"}</p>
                  <p className="mt-0.5 text-xs text-white/60">
                    {activeMainTarget > 0
                      ? `${activeMainTarget} meal${activeMainTarget !== 1 ? "s" : ""}${activeNeed?.dayMultiplier === 2 ? " (Thu+Fri)" : " per day"}${activeBreakfast ? ` + ${activeBreakfastCount} breakfast` : ""}`
                      : `No daily limit set${activeBreakfast ? " · + breakfast" : ""}`}
                  </p>
                  {activeRemaining !== null && (
                    <p className={`mt-0.5 text-xs font-semibold ${projectedRemaining !== null && projectedRemaining <= 0 ? "text-red-300" : "text-white/60"}`}>
                      {activeRemaining} meals remaining overall
                      {projectedRemaining !== activeRemaining && (
                        <> → {projectedRemaining} after save</>
                      )}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold leading-none">
                    {draft.length}
                    {activeTarget > 0 && <span className="text-sm font-semibold text-white/60">/{activeTarget}</span>}
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">selected</p>
                </div>
              </div>
              {activeTarget > 0 && draft.length > activeTarget && (
                <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                  {draft.length - activeTarget} over the plan allowance ({activeTarget} today). You can still save: extras are
                  deducted like normal picks, from the remaining meals and protein credits.
                </p>
              )}
              {projectedRemaining !== null && projectedRemaining < 0 && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                  Only {activeRemaining} meal{activeRemaining !== 1 ? "s" : ""} remain overall. Saving takes this
                  subscription to {projectedRemaining}.
                </p>
              )}
              {activeBuckets.length > 0 && (
                <div className="rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
                  <p className="text-xs font-bold text-neutral-900">
                    Protein credits ({activeUsedTotal}/{activeAllowanceTotal} used)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeBuckets.map((b) => (
                      <span
                        key={b.ingredientId}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${b.remaining <= 0 ? "border border-red-200 bg-red-50 text-red-600" : "bg-neutral-200/70 text-neutral-600"}`}
                      >
                        {b.name}: {b.remaining} left
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
                <p className="text-xs font-bold text-neutral-900">
                  Restrictions ({activeRestricted.length})
                </p>
                {activeRestricted.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeRestricted.map((name) => (
                      <span key={name} className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-neutral-500">No restrictions — all meals available.</p>
                )}
                <p className="mt-3 text-xs font-bold text-neutral-900">
                  Meals hidden by restrictions ({hiddenByRestriction(activeSub).length})
                </p>
                {hiddenByRestriction(activeSub).length > 0 ? (
                  <>
                    <button
                      onClick={() => setShowHidden((v) => !v)}
                      className="mt-1 text-xs font-medium text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900"
                    >
                      {showHidden ? "Hide names" : "Show names"}
                    </button>
                    <div className={`grid transition-all duration-300 ease-in-out ${showHidden ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {hiddenByRestriction(activeSub).map((m) => (
                            <span key={m.id} className="rounded-lg bg-neutral-200/70 px-2.5 py-1 text-xs font-medium text-neutral-600">
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-neutral-500">None hidden.</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search meals..."
                    className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
                  />
                </div>
                <div className="relative w-40 shrink-0">
                  <input
                    value={categoryOpen ? categoryQuery : category}
                    onChange={(e) => {
                      setCategoryQuery(e.target.value)
                      setCategoryOpen(true)
                    }}
                    onFocus={() => {
                      setCategoryQuery("")
                      setCategoryOpen(true)
                    }}
                    onBlur={() => setCategoryOpen(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setCategoryOpen(false)
                        e.currentTarget.blur()
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setCategoryOpen(true)
                      } else if (e.key === "Enter") {
                        e.preventDefault()
                        if (categoryMatches.length > 0) chooseCategory(categoryMatches[0])
                        else if (!categoryQuery.trim()) chooseCategory("")
                        else setCategoryOpen(false)
                      }
                    }}
                    placeholder={category || "All categories"}
                    role="combobox"
                    aria-expanded={categoryOpen}
                    aria-controls="category-options"
                    aria-label="Filter by category"
                    className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-3 pr-8 text-sm font-medium capitalize text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
                  />
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  {categoryOpen && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg" id="category-options">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => chooseCategory("")}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${category === "" ? "bg-neutral-100 font-semibold text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}
                      >
                        All categories
                        {category === "" && <Check size={12} />}
                      </button>
                      {categoryMatches.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => chooseCategory(c)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${category === c ? "bg-neutral-100 font-semibold text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}
                        >
                          <span className="truncate capitalize">{c}</span>
                          {category === c && <Check size={12} />}
                        </button>
                      ))}
                      {categoryMatches.length === 0 && (
                        <p className="px-2.5 py-2 text-xs text-neutral-400">No categories found.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {mealsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="size-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
                </div>
              ) : (
                <div className="space-y-2">
                  {mealsFor(activeSub).map((m) => {
                    const active = draft.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => setDraft((p) => (active ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                        className={`group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${active ? "border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900" : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"}`}
                      >
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                          {m.image_path ? (
                            <Image
                              src={imageThumb(m.image_path)}
                              alt={m.name}
                              fill
                              unoptimized
                              sizes="56px"
                              className="object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-neutral-300"><ChefHat size={20} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900">{m.name}</p>
                          {m.description && (
                            <p className="mt-0.5 truncate text-xs text-neutral-500">{m.description}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {activePreferred.has(m.id) && (
                              <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                Preferred
                              </span>
                            )}
                            {m.category && (
                              <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                                {m.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-all ${active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-transparent group-hover:border-neutral-400"}`}
                        >
                          <Check size={13} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {!mealsLoading && mealsFor(activeSub).length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-500">
                  No meals available{hiddenByRestriction(activeSub).length > 0 ? ` — ${hiddenByRestriction(activeSub).length} hidden by restrictions` : ""}.
                </p>
              )}
            </div>

            <div className="shrink-0 border-t border-[#F1F5F9] bg-white px-4 py-3 md:px-6">
              <button
                type="button"
                onClick={() => void save(activeSub.id)}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#15803D] text-base font-semibold text-white hover:bg-[#166534] disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save (${draft.length}${activeTarget > 0 ? `/${activeTarget}` : ""})`}
              </button>
              <button type="button" onClick={() => setExpanded(null)} className="mt-1 h-12 w-full text-base font-medium text-[#334155]">
                Cancel
              </button>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </div>
  )
}
