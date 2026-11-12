"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MealDetailDialog } from "@/components/ui"
import { MENU_CATEGORIES } from "@/constants"
import type { MenuCategory, MenuItem, MealServingOption } from "@/constants"
import { imageVariant } from "@/lib/images"
import { invalidateRecipes } from "@/hooks/useRecipes"
import {
  BadgeCheck,
  BadgeMinus,
  Beef,
  Blender,
  CakeSlice,
  Carrot,
  ChefHat,
  Citrus,
  ClipboardCheck,
  Coffee,
  CookingPot,
  CupSoda,
  Drumstick,
  Egg,
  Fish,
  Hamburger,
  HandPlatter,
  LayoutGrid,
  Pizza,
  Salad,
  Sandwich,
  Search,
  Soup,
  Utensils,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  chicken: Drumstick,
  beef: Beef,
  seafood: Fish,
  salad: Salad,
  wrap: Sandwich,
  breakfast: Egg,
  pasta: Wheat,
  soup: Soup,
  pizza: Pizza,
  burgers: Hamburger,
  drinks: CupSoda,
  biryani: CookingPot,
  risotto: ChefHat,
  smoothie: Blender,
  juice: Citrus,
  beverages: Coffee,
  desserts: CakeSlice,
  "rice-sides": CookingPot,
  platters: HandPlatter,
  vegetable: Carrot,
}

type MealListItem = MenuItem & { is_active?: boolean; is_subscription_included?: boolean }
type InclusionFilter = "all" | "included" | "excluded"

const PAGE_SIZE = 100

function formatMicros(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0
}

function mapRecipeToItem(r: Record<string, unknown>): MealListItem {
  const rawServings = (r.servings as Record<string, unknown>[]) ?? []
  const servings: MealServingOption[] = rawServings
    .filter((s) => (s.is_active as boolean) !== false)
    .map((s, i): MealServingOption => ({
      id: (s.id as string) ?? `${r.id as string}-serving-${i}`,
      name: (s.name as string | null) ?? null,
      price: (s.price as number | null) ?? null,
      calories: (s.calories as number | null) ?? null,
      nutrition: (s.nutrition as MealServingOption["nutrition"]) ?? null,
      is_active: (s.is_active as boolean) ?? true,
    }))
  const firstServing = rawServings[0] as Record<string, unknown> | undefined
  const firstNutrition = (firstServing?.nutrition as Record<string, unknown> | null)
    ?? (r.nutrition as Record<string, unknown> | null)

  const rawIngredients = (r.ingredients as MealListItem["ingredients"])
    ?? (firstServing?.ingredients as unknown as MealListItem["ingredients"])
    ?? []
  const ingredients: MealListItem["ingredients"] = (rawIngredients as unknown[]).map((ing) => {
    if (typeof ing === "string") return { name: ing, quantity_g: 100, unit: null }
    const o = ing as Record<string, unknown>
    const nested = o.ingredient as Record<string, unknown> | undefined
    return {
      name: ((nested?.name ?? o.name) as string) ?? "",
      quantity_g: ((o.quantity_g ?? 100) as number) ?? 100,
      unit: ((o.unit ?? null) as string | null) ?? null,
    }
  })

  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as MenuCategory) ?? "chicken",
    description: (r.description as string) ?? "",
    price: ((firstServing?.price ?? r.price) as number) ?? 0,
    calories: ((firstServing?.calories ?? r.calories) as number) ?? 0,
    protein: (firstNutrition?.protein_g as number) ?? 0,
    carbs: (firstNutrition?.carbs_g as number) ?? 0,
    fats: (firstNutrition?.fats_g as number) ?? (firstNutrition?.fat_g as number) ?? 0,
    fiber: (firstNutrition?.fiber_g as number) ?? 0,
    sugar: (firstNutrition?.sugar_g as number) ?? 0,
    sodium: (firstNutrition?.sodium_mg as number) ?? 0,
    image_path: (r.image_path as string) ?? null,
    ingredients,
    servings,
    is_active: (r.is_active as boolean) ?? true,
    is_subscription_included: (r.is_subscription_included as boolean) ?? false,
  }
}

export default function EmployeeMealSubscriptionPage() {
  const [menuItems, setMenuItems] = useState<MealListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [detailItem, setDetailItem] = useState<MealListItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeCat, setActiveCat] = useState<string>("all")
  const [inclusionFilter, setInclusionFilter] = useState<InclusionFilter>("all")

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      const all: MealListItem[] = []
      let offset = 0
      let expected = Infinity
      while (offset < expected) {
        const params = new URLSearchParams({
          sort: "name",
          limit: String(PAGE_SIZE),
          offset: String(offset),
        })
        if (debouncedSearch) params.set("search", debouncedSearch)
        if (activeCat !== "all") params.set("category", activeCat)
        if (inclusionFilter === "included") params.set("is_subscription_included", "true")
        if (inclusionFilter === "excluded") params.set("is_subscription_included", "false")
        const res = await fetch(`/api/recipe?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
        const rows: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? [])
        expected = Array.isArray(data) ? rows.length : (data.total ?? rows.length)
        if (rows.length === 0) break
        all.push(...rows.map(mapRecipeToItem))
        offset += rows.length
        if (rows.length < PAGE_SIZE) break
      }
      setMenuItems(all)
    } catch (e) {
      console.error("[MEALS] Failed to fetch subscription meals:", e instanceof Error ? e.message : e)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, activeCat, inclusionFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecipes()
  }, [fetchRecipes])

  const includedCount = menuItems.filter((item) => item.is_subscription_included).length

  async function handleToggle(item: MealListItem) {
    const next = !(item.is_subscription_included ?? false)
    setTogglingId(item.id)
    setMenuItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_subscription_included: next } : m)))
    try {
      const res = await fetch(`/api/recipe/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_subscription_included: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? "Failed to update meal")
      }
      if (inclusionFilter !== "all") fetchRecipes()
      void invalidateRecipes()
    } catch (e) {
      console.error("[MEALS] Subscription toggle failed:", e instanceof Error ? e.message : e)
      setMenuItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_subscription_included: !next } : m)))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
          <ClipboardCheck size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Subscription meals</h1>
          <p className="text-sm text-neutral-500">
            {inclusionFilter === "all"
              ? `${includedCount} of ${menuItems.length} meal${menuItems.length === 1 ? "" : "s"} included`
              : `${menuItems.length} meal${menuItems.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              className="w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-2.5 pl-10 text-sm text-neutral-900 outline-none backdrop-blur-sm placeholder:text-neutral-400 focus:border-neutral-400"
              placeholder="Search meals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white/80 p-1 backdrop-blur-sm">
            {(["all", "included", "excluded"] as InclusionFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInclusionFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  inclusionFilter === s
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <nav className="mb-5 flex gap-1 overflow-x-auto pb-2 sm:gap-2">
          {[{ label: "All", value: "all" }, ...MENU_CATEGORIES].map((cat) => {
            const isActive = activeCat === cat.value
            const Icon = CATEGORY_ICONS[cat.value] ?? Utensils
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveCat(cat.value)}
                className={`flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition-all ${
                  isActive
                    ? "bg-brand-900 text-white shadow-md"
                    : "bg-white text-neutral-500 ring-1 ring-border-light hover:text-brand-900 hover:ring-brand-900"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="text-center text-[11px] font-medium leading-tight">{cat.label}</span>
              </button>
            )
          })}
        </nav>

        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">Loading meals...</p>
        ) : menuItems.length > 0 ? (
          <div className="max-h-[calc(100dvh-16rem)] space-y-3 overflow-y-auto pr-1">
            {menuItems.map((item, i) => {
              const included = item.is_subscription_included ?? false
              const toggling = togglingId === item.id
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                  className={`rounded-2xl border border-neutral-200/60 bg-white/80 p-3 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50 sm:p-4 ${included ? "" : "opacity-70"}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                    <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-300 sm:size-24 lg:size-28"
                      >
                        {item.image_path ? (
                          <img src={imageVariant(item.image_path, 600)} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        ) : (
                          <UtensilsCrossed size={28} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="truncate text-left text-sm font-semibold text-neutral-900 hover:underline sm:text-base"
                          >
                            {item.name}
                          </button>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            included
                              ? "bg-green-100 text-green-700"
                              : "bg-neutral-200 text-neutral-600"
                          }`}>
                            {included ? "Included" : "Excluded"}
                          </span>
                          {item.is_active === false && (
                            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                              Disabled
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium capitalize text-neutral-600">
                            {MENU_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category}
                          </span>
                          <span className="font-bold text-neutral-900">{item.price} <span className="font-semibold text-neutral-400">DH</span></span>
                          <span className="font-semibold">{item.calories} Cal</span>
                          <span>P {formatMicros(item.protein)}g</span>
                          <span>C {formatMicros(item.carbs)}g</span>
                          <span>F {formatMicros(item.fats)}g</span>
                        </div>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500 sm:text-sm">{item.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 md:flex-col md:justify-center lg:flex-row lg:items-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        disabled={toggling}
                        title={included ? "Exclude from subscription plan" : "Include on subscription plan"}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-40 md:flex-none ${
                          included
                            ? "border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:bg-amber-100"
                            : "border-green-200 bg-green-50 text-green-600 hover:border-green-300 hover:bg-green-100"
                        }`}
                      >
                        {included ? <BadgeMinus size={14} /> : <BadgeCheck size={14} />}
                        {included ? "Exclude" : "Include"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-neutral-200 py-20">
            <UtensilsCrossed size={40} className="text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">
              {inclusionFilter === "included"
                ? "No meals are included on the subscription plan yet."
                : inclusionFilter === "excluded"
                  ? "No excluded meals found."
                  : "No meals found."}
            </p>
          </div>
        )}
      </div>

      <MealDetailDialog
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </motion.div>
  )
}
