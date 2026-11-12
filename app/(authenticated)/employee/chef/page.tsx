"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui"
import { imageThumb } from "@/lib/images"
import { proteinBuckets, type ProteinAllowance } from "@/lib/chef/credits"
import { autoFillDay, type AutoFillResult, type SuggestedStandard } from "@/lib/chef/autoFill"
import {
  activeOn,
  addCalendarDays,
  assignmentNeed,
  BREAKFAST_CATEGORY,
  deliverySlots,
  isDoubleThursday,
  isFridayDelivery,
  preferredRecipeIds,
  toISODate,
  weekdayOf,
} from "@/lib/chef/day"
import type { DailyStandard } from "@/lib/supabase/models"
import { CalendarDays, Check, CheckCircle2, ChefHat, ChevronDown, ChevronLeft, ChevronRight, Clock, Flame, Search, Sun, Sunrise, Sunset, X } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

const RECIPE_PAGE = 100
const SUB_RECIPE_QS = "is_active=true&is_subscription_included=true"

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
  servings: { ingredients?: { name: string }[] }[]
}

interface PickRow {
  id: string
  subscription_id: string
  recipe_id: string
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

function toStandardsMap(rows: DailyStandard[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const st of [...rows].sort((a, b) => a.position - b.position)) {
    const key = `${st.subscription_plan_id}::${st.meals_per_day}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(st.recipe_id)
  }
  return map
}

function restrictionSet(details: Record<string, unknown> | null): Set<string> {
  const d = details ?? {}
  const names = d.restrictionNames as Record<string, string> | undefined
  const list = names ? Object.values(names) : []
  return new Set(list.map((n) => String(n).toLowerCase()).filter(Boolean))
}

function restrictionNames(details: Record<string, unknown> | null): string[] {
  const d = details ?? {}
  const names = d.restrictionNames as Record<string, string> | undefined
  return names ? Object.values(names).map(String) : []
}

function customerName(sub: SubRow): string {
  const d = sub.details ?? {}
  return (d.name as string) || sub.customer?.name || "Customer"
}

interface CookDish {
  recipeId: string
  name: string
  image_path: string | null
  count: number
  breakfast: boolean
}

function aggregateCookList(
  items: { recipeId: string; breakfast?: boolean }[],
  recipeById: Map<string, RecipeRow>,
): CookDish[] {
  const map = new Map<string, CookDish>()
  for (const item of items) {
    const key = `${item.breakfast ? "bf:" : ""}${item.recipeId}`
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
      breakfast: Boolean(item.breakfast),
    })
  }
  return [...map.values()].sort((a, b) => {
    if (a.breakfast !== b.breakfast) return a.breakfast ? 1 : -1
    return b.count - a.count
  })
}

function weekdayLabel(iso: string): string {
  const w = weekdayOf(iso)
  return w.charAt(0).toUpperCase() + w.slice(1)
}

function CookListGrid({ dishes }: { dishes: CookDish[] }) {
  if (dishes.length === 0) return null
  return (
    <div className="grid grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
      {dishes.map((d) => (
        <div
          key={`${d.breakfast ? "bf:" : ""}${d.recipeId}`}
          className="flex items-center gap-3 bg-white py-3 sm:pr-6"
        >
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
            {d.image_path ? (
              <Image src={imageThumb(d.image_path)} alt={d.name} fill unoptimized sizes="56px" className="object-cover" loading="lazy" />
            ) : (
              <div className="flex size-full items-center justify-center text-neutral-400"><ChefHat size={20} /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {d.breakfast && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Breakfast</p>
            )}
            <p className="truncate text-base font-semibold text-neutral-900">{d.name}</p>
            <p className="mt-0.5 text-xs text-neutral-400">
              {d.count} portion{d.count !== 1 ? "s" : ""}
            </p>
          </div>
          <span className={`shrink-0 text-xl font-bold tabular-nums ${d.breakfast ? "text-amber-800" : "text-neutral-900"}`}>
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
  const [autofilling, setAutofilling] = useState(false)
  const [applying, setApplying] = useState(false)
  const [doneBusy, setDoneBusy] = useState<Set<string>>(new Set())

  function fetchRecipes() {
    setMealsLoading(true)
    fetchAllSubRecipes()
      .then((rows) => {
        setRecipes(rows)
        const set = new Set(rows.map((r) => r.category).filter(Boolean) as string[])
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

  const picksBySub = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const p of picks) {
      if (!map.has(p.subscription_id)) map.set(p.subscription_id, new Set())
      map.get(p.subscription_id)!.add(p.recipe_id)
    }
    return map
  }, [picks])

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  const dayBatch = useMemo(
    () =>
      aggregateCookList(
        picks.map((p) => ({ recipeId: p.recipe_id, breakfast: p.counts_toward_entitlement === false })),
        recipeById,
      ),
    [picks, recipeById],
  )

  const assignedCount = useMemo(
    () => daySubs.filter((s) => (picksBySub.get(s.id)?.size ?? 0) > 0).length,
    [daySubs, picksBySub],
  )

  const reviewBatch = useMemo(() => {
    if (!review) return []
    return aggregateCookList(
      review.flatMap((r) =>
        r.skipped
          ? []
          : [
              ...r.recipeIds.map((recipeId) => ({ recipeId, breakfast: false })),
              ...r.breakfastRecipeIds.map((recipeId) => ({ recipeId, breakfast: true })),
            ],
      ),
      recipeById,
    )
  }, [review, recipeById])

  const reviewReadyCount = review
    ? review.filter((r) => !r.skipped && (r.recipeIds.length > 0 || r.breakfastRecipeIds.length > 0)).length
    : 0

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
  const activeRestricted = activeSub ? restrictionNames(activeSub.details) : []
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
    setDraft(preset ?? [...(picksBySub.get(subId) ?? [])])
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
    const restricted = restrictionSet(sub.details)
    if (restricted.size === 0) return []
    return recipes.filter((m) =>
      (m.servings ?? []).some((s) => (s.ingredients ?? []).some((ing) => restricted.has(ing.name.toLowerCase()))),
    )
  }

  function mealsFor(sub: SubRow): RecipeRow[] {
    const restricted = restrictionSet(sub.details)
    let list = recipes
    if (category) list = list.filter((m) => m.category === category)
    if (restricted.size > 0) {
      list = list.filter(
        (m) => !(m.servings ?? []).some((s) => (s.ingredients ?? []).some((ing) => restricted.has(ing.name.toLowerCase()))),
      )
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

  async function save(subId: string) {
    setSaving(true)
    setError("")
    try {
      const sub = subs.find((s) => s.id === subId)
      const breakfastCount = sub ? assignmentNeed(sub, selected).breakfastCount : 0
      const { recipeIds, breakfastRecipeIds } = splitDraft(draft, breakfastCount)
      const res = await fetch("/api/chef-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_date: selected,
          subscription_id: subId,
          recipe_ids: recipeIds,
          breakfast_recipe_ids: breakfastRecipeIds,
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
      const [pool, standardsRes, fridayRes, picksRes, creditsRes] = await Promise.all([
        fetchAllSubRecipes(),
        fetch(`/api/daily-standards?date=${selected}`).then((r) => r.json()),
        fridayIso ? fetch(`/api/daily-standards?date=${fridayIso}`).then((r) => r.json()) : Promise.resolve([]),
        fetch(`/api/chef-schedules?subscription_ids=${daySubs.map((s) => s.id).join(",")}`).then((r) => r.json()),
        fetch("/api/plan-protein-credits").then((r) => r.json()),
      ])
      if (!Array.isArray(pool)) throw new Error("Failed to load meals")
      setRecipes(pool)
      setCategories(["", ...[...new Set(pool.map((r) => r.category).filter(Boolean) as string[])].sort()])
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
          return {
            id: s.id,
            customerName: customerName(s),
            subscription_plan_id: s.subscription_plan_id,
            mealsPerDay: need.mealsPerDay,
            dayMultiplier: need.dayMultiplier,
            breakfastCount: need.breakfastCount,
            isFridayMoved: need.isFridayMoved,
            restrictedNames: [...restrictionSet(s.details)],
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
      setReview(output.results)
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
      .filter((r) => !r.skipped && (r.recipeIds.length > 0 || r.breakfastRecipeIds.length > 0))
      .map((r) => ({
        subscription_id: r.subscriptionId,
        recipe_ids: r.recipeIds,
        breakfast_recipe_ids: r.breakfastRecipeIds,
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

  const firstDay = new Date(month.y, month.m, 1).getDay()
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function shiftMonth(delta: number) {
    setMonth((p) => {
      const d = new Date(p.y, p.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  return (
    <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
              {tab === "today" ? <Flame size={20} /> : <ChefHat size={20} />}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {tab === "today" ? "To Cook Today" : "Chef Schedule"}
              </h1>
              <p className="text-sm text-neutral-500">
                {tab === "today" ? "Everything the kitchen must cook today" : "Pick a day, suggest meals, review, then apply"}
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1 sm:w-auto">
            <button
              onClick={() => setTab("schedule")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${tab === "schedule" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              <CalendarDays size={14} /> Schedule
            </button>
            <button
              onClick={() => setTab("today")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${tab === "today" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              <Flame size={14} /> To Cook Today
            </button>
          </div>
        </div>
      </motion.div>

      {tab === "schedule" ? (
      <>
      <motion.div variants={itemVariants}>
        <div className="rounded-2xl border border-neutral-200/60 bg-white/80 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="outline" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={16} />
            </Button>
            <p className="font-semibold text-neutral-900">
              {new Date(month.y, month.m, 1).toLocaleString("default", { month: "long", year: "numeric" })}
            </p>
            <Button variant="outline" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight size={16} />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={`e-${i}`} />
              const iso = toISODate(new Date(month.y, month.m, day))
              const isActive = iso === selected
              const isToday = iso === today
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={`relative rounded-lg py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-neutral-900 text-white"
                      : isToday
                        ? "bg-neutral-100 text-neutral-900 ring-1 ring-neutral-900"
                        : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {day}
                  {isToday && !isActive && (
                    <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-neutral-900" />
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-neutral-500">Selected: <span className="font-semibold text-neutral-900">{selected}</span></p>
            <Button variant="outline" onClick={() => { setSelected(today); const n = new Date(); setMonth({ y: n.getFullYear(), m: n.getMonth() }) }}>
              Today
            </Button>
          </div>
        </div>
      </motion.div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <motion.div variants={itemVariants} className="-mx-6 -mb-6 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Kitchen batch</p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-neutral-900">{weekdayLabel(selected)}</h2>
            {dayBatch.length > 0 && (
              <p className="mt-1 text-sm text-neutral-500">
                <span className="font-semibold text-neutral-900">{dayBatch.length}</span> dish{dayBatch.length !== 1 ? "es" : ""}
                <span className="mx-1.5 text-neutral-300">·</span>
                <span className="font-semibold text-neutral-900">{picks.length}</span> portion{picks.length !== 1 ? "s" : ""}
                <span className="mx-1.5 text-neutral-300">·</span>
                <span className="font-semibold text-neutral-900">{assignedCount}</span>/{daySubs.length} assigned
              </p>
            )}
          </div>
          <Button onClick={runAutoFill} disabled={autofilling || daySubs.length === 0}>
            {autofilling ? "Suggesting..." : dayBatch.length > 0 ? "Resuggest" : "Suggest meals"}
          </Button>
        </div>
        {daySubs.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-neutral-500">
            {weekdayOf(selected) === "friday"
              ? "Closed on Fridays — Friday deliveries are prepared Thursday."
              : "No subscribed customers for this day."}
          </p>
        ) : dayBatch.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-neutral-500">
            {daySubs.length} customer{daySubs.length !== 1 ? "s" : ""} scheduled. Suggest meals to fill one batch.
          </p>
        ) : (
          <div className="px-6 pb-4">
            <CookListGrid dishes={dayBatch} />
          </div>
        )}

      {daySubs.length > 0 && (
        <>
        <div className="px-6 pt-2">
          <h2 className="text-lg font-semibold text-neutral-900">Plates</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Each customer gets a slice of the batch. Edit only when a plate needs a swap.</p>
        </div>
        <div className="mt-2 max-h-[min(22rem,50vh)] overflow-y-auto overscroll-contain px-6">
          <div className="divide-y divide-neutral-100">
          {daySubs.map((sub) => {
            const picked = picksBySub.get(sub.id) ?? new Set<string>()
            const details = (sub.details ?? {}) as Record<string, unknown>
            const need = assignmentNeed(sub, selected)
            const target = need.totalCount
            const done = picked.size
            const complete = target > 0 ? done >= target : done > 0
            const partial = done > 0 && !complete
            const restrictions = restrictionNames(sub.details)
            const remaining = sub.remaining_meal_count ?? null
            const depleted = remaining !== null && remaining <= 0
            const pickedRecipes = [...picked].map((rid) => recipeById.get(rid)).filter((r): r is RecipeRow => !!r)
            const extras = [
              preferredRecipeIds(sub.details).length > 0 ? "flexible" : "",
              need.breakfastCount > 0 ? "breakfast extra" : "",
              isDoubleThursday(sub, selected) ? "Thu+Fri" : isFridayDelivery(sub, selected) ? "Fri on Thu" : "",
            ].filter(Boolean)
            return (
              <div key={sub.id} className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 ${depleted ? "opacity-60" : ""}`}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                  {customerName(sub).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{customerName(sub)}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {(details.planName as string) ?? "Subscription"}
                    {need.mealsPerDay > 0 ? ` · ${need.mealsPerDay}/day` : ""}
                    {extras.length > 0 ? ` · ${extras.join(" · ")}` : ""}
                    {remaining !== null ? ` · ${remaining} left` : ""}
                    {restrictions.length > 0 ? ` · avoids ${restrictions.slice(0, 2).join(", ")}${restrictions.length > 2 ? ` +${restrictions.length - 2}` : ""}` : ""}
                  </p>
                </div>
                {pickedRecipes.length > 0 && (
                  <div className="hidden shrink-0 items-center sm:flex">
                    {pickedRecipes.slice(0, 5).map((r, i) => (
                      <div
                        key={r.id}
                        title={r.name}
                        className="relative size-8 overflow-hidden rounded-full bg-neutral-200 ring-2 ring-white"
                        style={{ marginLeft: i === 0 ? 0 : -8, zIndex: pickedRecipes.length - i }}
                      >
                        {r.image_path ? (
                          <Image src={imageThumb(r.image_path)} alt={r.name} fill unoptimized sizes="32px" className="object-cover" loading="lazy" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-neutral-400"><ChefHat size={12} /></div>
                        )}
                      </div>
                    ))}
                    {pickedRecipes.length > 5 && (
                      <span className="ml-1 text-[11px] font-medium text-neutral-500">+{pickedRecipes.length - 5}</span>
                    )}
                  </div>
                )}
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  depleted ? "bg-neutral-200 text-neutral-500"
                  : complete ? "bg-emerald-50 text-emerald-700"
                  : partial ? "bg-amber-50 text-amber-700"
                  : "bg-neutral-100 text-neutral-500"
                }`}>
                  {depleted ? "Depleted" : complete ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {!depleted && (target > 0 ? `${Math.min(done, target)}/${target}` : done > 0 ? `${done}` : "—")}
                </span>
                <Button size="sm" variant="outline" onClick={() => openPicker(sub.id)} disabled={depleted}>
                  {depleted ? "None" : done > 0 ? "Edit" : "Set"}
                </Button>
              </div>
            )
          })}
          </div>
        </div>
        </>
      )}
      </motion.div>
      </>
      ) : (
      <>
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Portions", value: filteredTodayPicks.length },
            { label: "Meals", value: todayByMeal.length },
            { label: "Customers", value: todayCustomerIds.size },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-neutral-200/60 bg-white/80 p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {([
            { id: "morning", icon: Sunrise },
            { id: "noon", icon: Sun },
            { id: "evening", icon: Sunset },
          ] as const).map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSlotFilter(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-all ${slotFilter === id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"}`}
            >
              <Icon size={14} />
              {id}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">Meals to cook — {today}</h2>
          {filteredTodayPicks.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                const allDone = filteredTodayPicks.every((p) => p.done_at)
                setPicksDone(
                  filteredTodayPicks.map((p) => p.id),
                  !allDone,
                )
              }}
              disabled={filteredTodayPicks.some((p) => doneBusy.has(p.id))}
            >
              {filteredTodayPicks.every((p) => p.done_at) ? "Reopen all" : "Mark all done"}
            </Button>
          )}
        </div>
        {todayByMeal.length > 0 ? (
          <div className="space-y-3">
            {todayByMeal.map(({ recipe, recipeId, count, done, customers, pickIds }) => {
              const allDone = done >= count
              const busy = pickIds.some((id) => doneBusy.has(id))
              return (
              <div key={recipeId} className={`flex items-center gap-3 rounded-2xl border p-3 backdrop-blur-sm transition-colors ${allDone ? "border-emerald-200/70 bg-emerald-50/50" : "border-neutral-200/60 bg-white/80"}`}>
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  {recipe?.image_path ? (
                    <Image src={imageThumb(recipe.image_path)} alt={recipe.name} fill unoptimized sizes="56px" className="object-cover" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-neutral-300"><ChefHat size={20} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{recipe?.name ?? "Unknown meal"}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">{customers.join(", ")}</p>
                  <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-neutral-200/70">
                    <div
                      className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-neutral-900"}`}
                      style={{ width: `${Math.min(100, (done / Math.max(1, count)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white">×{count}</span>
                <span className={`shrink-0 text-xs font-semibold ${allDone ? "text-emerald-700" : "text-neutral-500"}`}>{done}/{count}</span>
                <button
                  onClick={() => setPicksDone(pickIds, !allDone)}
                  disabled={busy}
                  aria-label={allDone ? "Reopen meal" : "Mark meal done"}
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-50 ${allDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 text-neutral-400 hover:border-neutral-900 hover:text-neutral-900"}`}
                >
                  {busy ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                  ) : (
                    <Check size={16} />
                  )}
                </button>
              </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-neutral-200 py-20">
            <Flame size={40} className="text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">Nothing scheduled to cook today.</p>
            <Button variant="outline" onClick={() => setTab("schedule")}>Open schedule</Button>
          </div>
        )}
      </motion.div>

      {todayUnpicked.length > 0 && (
        <motion.div variants={itemVariants}>
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Still to pick ({todayUnpicked.length})</h2>
          <div className="space-y-2">
            {todayUnpicked.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                    {customerName(sub).slice(0, 1).toUpperCase()}
                  </div>
                  <p className="truncate text-sm font-medium text-neutral-900">{customerName(sub)}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(today)
                    const n = new Date()
                    setMonth({ y: n.getFullYear(), m: n.getMonth() })
                    setTab("schedule")
                  }}
                >
                  Set meals
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      </>
      )}

      {review && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setReview(null)}>
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Review kitchen batch — {selected}</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {reviewBatch.length} dish{reviewBatch.length !== 1 ? "es" : ""} for {reviewReadyCount} of {review.length} customers. Apply, then edit a plate if needed.
                </p>
              </div>
              <button
                onClick={() => setReview(null)}
                aria-label="Close review"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Cook these</p>
                {reviewBatch.length > 0 ? (
                  <CookListGrid dishes={reviewBatch} />
                ) : (
                  <p className="text-sm text-neutral-500">Nothing new to apply — plates are already set or skipped.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Plates</p>
                <div className="divide-y divide-neutral-100">
                  {review.map((r) => {
                    const notable = r.issues.filter((i) => i.kind !== "suggested" && i.kind !== "skipped")
                    const blocking = notable.filter((i) => i.kind === "no-replacement" || i.kind === "no-standard" || i.kind === "depleted")
                    const dishIds = [...r.recipeIds, ...r.breakfastRecipeIds]
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
            <div className="flex gap-2 border-t border-neutral-100 p-4">
              <Button onClick={confirmApply} disabled={applying || reviewReadyCount === 0}>
                {applying ? "Applying..." : `Apply batch (${reviewReadyCount})`}
              </Button>
              <Button variant="outline" onClick={() => setReview(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {activeSub && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setExpanded(null)}>
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">{customerName(activeSub)}</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {selected}{activeTarget > 0 ? ` · pick ${activeTarget}` : ""}
                </p>
              </div>
              <button
                onClick={() => setExpanded(null)}
                aria-label="Close meal picker"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={16} />
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
                  Over plan allowance by {draft.length - activeTarget} — today covers {activeTarget} meals.
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
                  Restricted ingredients ({activeRestricted.length})
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

            <div className="flex gap-2 border-t border-neutral-100 p-4">
              <Button onClick={() => save(activeSub.id)} disabled={saving}>
                {saving ? "Saving..." : `Save (${draft.length}${activeTarget > 0 ? `/${activeTarget}` : ""})`}
              </Button>
              <Button variant="outline" onClick={() => setExpanded(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
