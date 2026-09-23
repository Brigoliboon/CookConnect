"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui"
import { CalendarDays, Check, CheckCircle2, ChefHat, ChevronLeft, ChevronRight, Clock, Flame, Search, X } from "lucide-react"

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

const RECIPE_LIMIT = 60

interface SubRow {
  id: string
  customer_id: string | null
  status: string
  started_at: string
  expires_at: string
  details: Record<string, unknown> | null
  customer: { id: string; name: string; email: string } | null
}

interface RecipeRow {
  id: string
  name: string
  category: string | null
  description: string | null
  image_path: string | null
  servings: { ingredients?: { name: string }[] }[]
}

interface PickRow {
  subscription_id: string
  recipe_id: string
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

function weekdayOf(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

function shortDay(name: string): string {
  return name.slice(0, 3).replace(/^\w/, (c) => c.toUpperCase())
}

function deliveryDays(details: Record<string, unknown> | null): string[] {
  const d = details ?? {}
  const days = d.days as string[] | undefined
  return Array.isArray(days) ? days.map((v) => String(v).toLowerCase()) : []
}

function activeOn(sub: SubRow, date: string): boolean {
  if (sub.status !== "active") return false
  const day = date.slice(0, 10)
  const start = (sub.started_at ?? "").slice(0, 10)
  const end = (sub.expires_at ?? "").slice(0, 10)
  if (start && day < start) return false
  if (end && day > end) return false
  const details = (sub.details ?? {}) as Record<string, unknown>
  if (details.onCall) return false
  const days = deliveryDays(sub.details)
  if (days.length === 0) return true
  return days.includes(weekdayOf(day))
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

export default function EmployeeChefPage() {
  const today = useMemo(() => toISODate(new Date()), [])
  const [tab, setTab] = useState<"schedule" | "today">("schedule")
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
  const [categories, setCategories] = useState<string[]>([""])
  const [mealsLoading, setMealsLoading] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [picksOpen, setPicksOpen] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [todayPicks, setTodayPicks] = useState<PickRow[]>([])

  function fetchRecipes(cat: string) {
    setMealsLoading(true)
    const q = cat ? `&category=${encodeURIComponent(cat)}` : ""
    fetch(`/api/recipe?sort=name&limit=${RECIPE_LIMIT}${q}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
        return (data.data ?? []) as RecipeRow[]
      })
      .then((rows) => {
        setRecipes(rows)
        if (!cat) {
          const set = new Set(rows.map((r) => r.category).filter(Boolean) as string[])
          setCategories(["", ...[...set].sort()])
        }
      })
      .catch((e) => setError(e.message || "Failed to load meals"))
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
    fetchRecipes("")
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

  const todayByMeal = useMemo(() => {
    const map = new Map<string, { count: number; customers: string[] }>()
    for (const p of todayPicks) {
      const entry = map.get(p.recipe_id) ?? { count: 0, customers: [] as string[] }
      entry.count += 1
      const sub = subs.find((s) => s.id === p.subscription_id)
      if (sub) entry.customers.push(customerName(sub))
      map.set(p.recipe_id, entry)
    }
    return [...map.entries()]
      .map(([rid, v]) => ({ recipe: recipeById.get(rid) ?? null, recipeId: rid, ...v }))
      .sort((a, b) => b.count - a.count)
  }, [todayPicks, subs, recipeById])

  const todayCustomerIds = useMemo(() => new Set(todayPicks.map((p) => p.subscription_id)), [todayPicks])

  const todayUnpicked = useMemo(
    () => subs.filter((s) => activeOn(s, today) && !todayCustomerIds.has(s.id)),
    [subs, today, todayCustomerIds],
  )

  const activeSub = expanded ? (daySubs.find((s) => s.id === expanded) ?? null) : null
  const activeDetails = (activeSub?.details ?? {}) as Record<string, unknown>
  const activeTarget = (activeDetails.mealsPerDay as number) ?? 0
  const activeRestricted = activeSub ? restrictionNames(activeSub.details) : []

  function openPicker(subId: string) {
    setExpanded(subId)
    setDraft([...(picksBySub.get(subId) ?? [])])
    setSearch("")
    setCategory("")
    setShowHidden(false)
    fetchRecipes("")
  }

  function selectCategory(c: string) {
    setCategory(c)
    fetchRecipes(c)
  }

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
    if (restricted.size > 0) {
      list = list.filter(
        (m) => !(m.servings ?? []).some((s) => (s.ingredients ?? []).some((ing) => restricted.has(ing.name.toLowerCase()))),
      )
    }
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((m) => m.name.toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q))
    return list
  }

  async function save(subId: string) {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/chef-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: selected, subscription_id: subId, recipe_ids: draft }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to save")
      }
      const data = (await res.json()) as PickRow[]
      setPicks((prev) => [...prev.filter((p) => p.subscription_id !== subId), ...data])
      setExpanded(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
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
                {tab === "today" ? "Everything the kitchen must cook today" : "Pick a day, then set meals for each customer"}
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

      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Customers — {selected}</h2>
        {daySubs.length > 0 ? (
          <div className="space-y-4">
            {daySubs.map((sub) => {
              const picked = picksBySub.get(sub.id) ?? new Set<string>()
              const details = (sub.details ?? {}) as Record<string, unknown>
              const mealsPerDay = (details.mealsPerDay as number) ?? 0
              const target = mealsPerDay > 0 ? mealsPerDay : 0
              const done = picked.size
              const complete = target > 0 ? done >= target : done > 0
              const partial = done > 0 && !complete
              const restrictions = restrictionNames(sub.details)
              const pickedRecipes = [...picked].map((rid) => recipeById.get(rid)).filter((r): r is RecipeRow => !!r)
              return (
                <div key={sub.id} className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 backdrop-blur-sm">
                  <div className={`h-1 w-full ${complete ? "bg-emerald-500" : partial ? "bg-amber-400" : "bg-neutral-200"}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
                          {customerName(sub).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-neutral-900">{customerName(sub)}</p>
                          <p className="mt-0.5 truncate text-xs text-neutral-500">
                            {(details.planName as string) ?? "Subscription"}
                            {target > 0 ? ` · ${target}/day` : ""}
                            {restrictions.length > 0 ? ` · avoids ${restrictions.slice(0, 2).join(", ")}${restrictions.length > 2 ? ` +${restrictions.length - 2}` : ""}` : ""}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-neutral-400">
                            {(details.onCall as boolean)
                              ? "On-call delivery"
                              : `${deliveryDays(sub.details).map(shortDay).join(", ") || "Every day"}${details.slot ? ` · ${String(details.slot)}${details.time ? ` ${String(details.time)}` : ""}` : ""}`}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        complete ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : partial ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        : "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200"
                      }`}>
                        {complete ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                        {target > 0 ? `${Math.min(done, target)}/${target}` : done > 0 ? `${done} set` : "To pick"}
                      </span>
                    </div>

                    {target > 0 && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-amber-400"}`}
                          style={{ width: `${Math.min(100, (done / target) * 100)}%` }}
                        />
                      </div>
                    )}

                    {pickedRecipes.length > 0 && (
                      <div className="mt-4">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {pickedRecipes.slice(0, 2).map((r) => (
                            <div key={r.id} className="flex items-center gap-2.5 rounded-xl bg-neutral-50 p-2 ring-1 ring-neutral-100">
                              <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                                {r.image_path ? (
                                  <Image src={r.image_path} alt={r.name} fill sizes="40px" className="object-cover" loading="lazy" />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-neutral-400"><ChefHat size={16} /></div>
                                )}
                              </div>
                              <p className="truncate text-xs font-medium text-neutral-700">{r.name}</p>
                            </div>
                          ))}
                        </div>
                        {pickedRecipes.length > 2 && (
                          <>
                            <div className={`grid transition-all duration-300 ease-in-out ${picksOpen.has(sub.id) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                              <div className="overflow-hidden">
                                <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                                  {pickedRecipes.slice(2).map((r) => (
                                    <div key={r.id} className="flex items-center gap-2.5 rounded-xl bg-neutral-50 p-2 ring-1 ring-neutral-100">
                                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                                        {r.image_path ? (
                                          <Image src={r.image_path} alt={r.name} fill sizes="40px" className="object-cover" loading="lazy" />
                                        ) : (
                                          <div className="flex size-full items-center justify-center text-neutral-400"><ChefHat size={16} /></div>
                                        )}
                                      </div>
                                      <p className="truncate text-xs font-medium text-neutral-700">{r.name}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setPicksOpen((prev) => {
                                const next = new Set(prev)
                                if (next.has(sub.id)) next.delete(sub.id)
                                else next.add(sub.id)
                                return next
                              })}
                              className="mt-2 text-xs font-medium text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900"
                            >
                              {picksOpen.has(sub.id) ? "Show less" : `Show all ${pickedRecipes.length} meals`}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      <Button onClick={() => openPicker(sub.id)}>{done > 0 ? "Edit meals" : "Set meals"}</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-neutral-200 py-20">
            <CalendarDays size={40} className="text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No subscribed customers for this day.</p>
          </div>
        )}
      </motion.div>
      </>
      ) : (
      <>
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Portions", value: todayPicks.length },
            { label: "Meals", value: todayByMeal.length },
            { label: "Customers", value: todayCustomerIds.size },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-neutral-200/60 bg-white/80 p-4 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Meals to cook — {today}</h2>
        {todayByMeal.length > 0 ? (
          <div className="space-y-3">
            {todayByMeal.map(({ recipe, recipeId, count, customers }) => (
              <div key={recipeId} className="flex items-center gap-3 rounded-2xl border border-neutral-200/60 bg-white/80 p-3 backdrop-blur-sm">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  {recipe?.image_path ? (
                    <Image src={recipe.image_path} alt={recipe.name} fill sizes="56px" className="object-cover" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-neutral-300"><ChefHat size={20} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{recipe?.name ?? "Unknown meal"}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">{customers.join(", ")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white">×{count}</span>
              </div>
            ))}
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
                    {activeTarget > 0 ? `${activeTarget} meal${activeTarget !== 1 ? "s" : ""} per day` : "No daily limit set"}
                  </p>
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
                  Over plan allowance by {draft.length - activeTarget} — plan covers {activeTarget} per day.
                </p>
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

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search meals..."
                  className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((c) => (
                  <button
                    key={c || "all"}
                    onClick={() => selectCategory(c)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all ${category === c ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
                  >
                    {c || "All"}
                  </button>
                ))}
              </div>
              {mealsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="size-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {mealsFor(activeSub).map((m) => {
                    const active = draft.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => setDraft((p) => (active ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                        className={`group overflow-hidden rounded-xl border text-left transition-all ${active ? "border-neutral-900 ring-2 ring-neutral-900" : "border-neutral-200 hover:border-neutral-400"}`}
                      >
                        <div className="relative aspect-[4/3] w-full bg-neutral-100">
                          {m.image_path ? (
                            <Image
                              src={m.image_path}
                              alt={m.name}
                              fill
                              sizes="(max-width: 640px) 50vw, 33vw"
                              className="object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-neutral-300"><ChefHat size={24} /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          {active && <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-white text-neutral-900"><Check size={12} /></span>}
                        </div>
                        <div className="p-2">
                          <p className="truncate text-xs font-semibold text-neutral-900">{m.name}</p>
                          {m.category && <p className="mt-0.5 text-[11px] capitalize text-neutral-500">{m.category}</p>}
                        </div>
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
