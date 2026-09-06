"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { Search, X, ChevronDown, SlidersHorizontal, ArrowUp } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { translateContent } from "@/constants/translations"
import { Nav } from "@/components/landing/Nav"
import { Footer } from "@/components/landing/Footer"
import { CatalogMealCard } from "@/components/landing/CatalogMealCard"
import type { MealServingOption } from "@/constants"

const PAGE_SIZE = 24

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.08 },
  }),
}

interface MenuItem {
  id: string
  name: string
  category: string
  description: string
  image: string
  price: number
  calories: number
  protein: number
  carbs: number
  fats: number
  servings: MealServingOption[]
}

const fallbackImages: Record<string, string> = {
  beef: "/placeholder/empty_plate.svg",
  chicken: "/placeholder/empty_plate.svg",
  seafood: "/placeholder/empty_plate.svg",
  salad: "/placeholder/empt_salad_bowl.png",
  wrap: "/placeholder/empty_plate.svg",
  breakfast: "/placeholder/empty_bowl.png",
  pasta: "/placeholder/empty_plate.svg",
  soup: "/placeholder/empty_bowl.png",
  pizza: "/placeholder/empty_plate.svg",
  burgers: "/placeholder/empty_plate.svg",
  drinks: "/drink_sample.svg",
  biryani: "/placeholder/empty_plate.svg",
  risotto: "/placeholder/empty_plate.svg",
  smoothie: "/drink_sample.svg",
  juice: "/drink_sample.svg",
  beverages: "/drink_sample.svg",
  desserts: "/drink_sample.svg",
  "rice-sides": "/placeholder/empty_plate.svg",
  platters: "/drink_sample.svg",
  vegetable: "/placeholder/empty_plate.svg",
}

function mapRecipe(r: Record<string, unknown>): MenuItem {
  const category = (r.category as string) ?? ""
  const servings = ((r.servings as Record<string, unknown>[]) ?? [])
    .filter((s) => (s.is_active as boolean) !== false)
    .map((s) => ({
      id: s.id as string,
      name: (s.name as string | null) ?? null,
      price: (s.price as number | null) ?? null,
      calories: (s.calories as number | null) ?? null,
      nutrition: (s.nutrition as MealServingOption["nutrition"]) ?? null,
      is_active: (s.is_active as boolean) ?? true,
    }))
  const first = servings[0]
  return {
    id: (r.id as string) ?? "",
    name: (r.name as string) ?? "",
    category,
    description: (r.description as string) ?? "",
    image: (r.image_path as string) ?? fallbackImages[category] ?? "/drink_sample.svg",
    price: first?.price ?? 0,
    calories: first?.calories ?? 0,
    protein: first?.nutrition?.protein_g ?? 0,
    carbs: first?.nutrition?.carbs_g ?? 0,
    fats: first?.nutrition?.fats_g ?? 0,
    servings,
  }
}

const categories = [
  { id: "all", label: "All" },
  { id: "meals", label: "Meals", subs: ["beef", "chicken", "seafood", "soup", "biryani", "risotto", "vegetable", "breakfast"] },
  { id: "salad", label: "Salad" },
  { id: "rice-sides", label: "Rice & Sides" },
  { id: "platters", label: "Platters" },
  { id: "pasta", label: "Pasta" },
  { id: "wraps", label: "Wraps" },
  { id: "pizza", label: "Pizza" },
  { id: "burgers", label: "Burgers" },
  { id: "desserts", label: "Desserts" },
  { id: "drinks", label: "Drinks", subs: ["smoothie", "juice", "beverages"] },
]

const subValues: Record<string, string> = {
  beef: "beef",
  chicken: "chicken",
  seafood: "seafood",
  soup: "soup",
  breakfast: "breakfast",
  biryani: "biryani",
  risotto: "risotto",
  vegetable: "vegetable",
  smoothie: "smoothie",
  juice: "juice",
  beverages: "beverages",
}

const catValues: Record<string, string> = {
  salad: "salad",
  "rice-sides": "rice-sides",
  platters: "platters",
  pasta: "pasta",
  wraps: "wrap",
  pizza: "pizza",
  burgers: "burgers",
  desserts: "desserts",
  drinks: "drinks",
}

const sortOptions = [
  { id: "default", labelKey: "default" },
  { id: "name", labelKey: "sortName" },
  { id: "name_desc", labelKey: "sortNameDesc" },
  { id: "calories", labelKey: "sortCalories" },
  { id: "calories_desc", labelKey: "sortCaloriesDesc" },
  { id: "price", labelKey: "sortPrice" },
  { id: "price_desc", labelKey: "sortPriceDesc" },
]

interface RangeInputsProps {
  label: string
  minValue: string
  maxValue: string
  minPlaceholder: string
  maxPlaceholder: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
}

function RangeInputs({ label, minValue, maxValue, minPlaceholder, maxPlaceholder, onMinChange, onMaxChange }: RangeInputsProps) {
  return (
    <div>
      <p className="font-nunito text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input type="number" min="0" value={minValue} onChange={(event) => onMinChange(event.target.value)} placeholder={minPlaceholder} aria-label={minPlaceholder} className="min-w-0 border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-neutral-400" />
        <span className="text-xs text-neutral-400">–</span>
        <input type="number" min="0" value={maxValue} onChange={(event) => onMaxChange(event.target.value)} placeholder={maxPlaceholder} aria-label={maxPlaceholder} className="min-w-0 border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-neutral-400" />
      </div>
    </div>
  )
}

export default function CatalogPage() {
  const t = useTranslations("catalog")
  const ft = useTranslations("featured")
  const locale = useLocale()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeSub, setActiveSub] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState("default")
  const [minCal, setMinCal] = useState("")
  const [maxCal, setMaxCal] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")

  const activeCat = categories.find((c) => c.id === activeCategory)
  const hasActiveFilters = search !== "" || activeCategory !== "all" || sort !== "default" || minCal !== "" || maxCal !== "" || minPrice !== "" || maxPrice !== ""

  const buildUrl = useCallback((offset: number) => {
    const params = new URLSearchParams()
    if (activeCategory !== "all") {
      const targetValue = activeCat?.subs ? (subValues[activeSub ?? ""] ?? activeCat.subs[0]) : catValues[activeCategory]
      if (targetValue) params.set("category", targetValue)
    }
    if (search) params.set("search", search)
    if (sort !== "default") params.set("sort", sort)
    if (minCal) params.set("min_cal", minCal)
    if (maxCal) params.set("max_cal", maxCal)
    if (minPrice) params.set("min_price", minPrice)
    if (maxPrice) params.set("max_price", maxPrice)
    params.set("is_active", "true")
    params.set("offset", String(offset))
    params.set("limit", String(PAGE_SIZE))
    return `/api/recipe?${params.toString()}`
  }, [activeCategory, activeSub, search, sort, minCal, maxCal, minPrice, maxPrice, activeCat])

  const fetchPage = useCallback(async (offset: number, append: boolean, signal?: AbortSignal) => {
    const res = await fetch(buildUrl(offset), { signal })
    if (!res.ok) throw new Error("Failed to fetch recipes")
    const json = await res.json()
    const raw = json.data ?? json
    const count = json.total ?? (Array.isArray(raw) ? raw.length : 0)
    const items = Array.isArray(raw) ? raw.map(mapRecipe) : []
    if (signal?.aborted) return
    setTotal(count)
    setMenuItems((prev) => (append ? [...prev, ...items] : items))
  }, [buildUrl])

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(0, false, controller.signal)
      .catch((e) => {
        if (e.name !== "AbortError") console.error("[CATALOG] Failed to fetch recipes:", e)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [fetchPage])

  const hasMore = menuItems.length < total

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry.isIntersecting || loadingMore || !hasMore) return
        setLoadingMore(true)
        fetchPage(menuItems.length, true)
          .catch((e) => console.error("[CATALOG] Failed to fetch recipes:", e))
          .finally(() => setLoadingMore(false))
      },
      { rootMargin: "400px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading, loadingMore, hasMore, menuItems.length, fetchPage])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchInput === search) return
    setLoading(true)
    setSearch(searchInput)
  }

  function handleCategoryClick(catId: string) {
    if (catId === activeCategory) return
    const category = categories.find((item) => item.id === catId)
    setLoading(true)
    setActiveCategory(catId)
    setActiveSub(category?.subs?.[0] ?? null)
  }

  function handleSubClick(sub: string) {
    if (sub === activeSub) return
    setLoading(true)
    setActiveSub(sub)
  }

  function handleClearFilters() {
    if (!hasActiveFilters) return
    setLoading(true)
    setActiveCategory("all")
    setActiveSub(null)
    setSort("default")
    setMinCal("")
    setMaxCal("")
    setMinPrice("")
    setMaxPrice("")
    setSearch("")
    setSearchInput("")
  }

  const filterPanel = (
    <div className="border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-nunito text-sm font-semibold text-neutral-900">{t("filters")}</p>
          <p className="font-nunito mt-0.5 text-xs text-neutral-500">{t("filterHint")}</p>
        </div>
        <button
          type="button"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          className="border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {t("clearAll")}
        </button>
      </div>

      <div className="mt-5 border-t border-neutral-100 pt-4">
        <p className="font-nunito text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{t("categories")}</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
              }`}
            >
              {ft(`cats.${cat.id}`)}
            </button>
          ))}
        </div>
        {activeCat?.subs && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeCat.subs.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => handleSubClick(sub)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  activeSub === sub
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900"
                }`}
              >
                {ft(`subs.${sub}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 border-t border-neutral-100 pt-4 md:grid-cols-3">
        <label className="block">
          <span className="block font-nunito text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{t("sortBy")}</span>
          <select
            value={sort}
            onChange={(e) => { setLoading(true); setSort(e.target.value) }}
            className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-400"
          >
            {sortOptions.map((option) => <option key={option.id} value={option.id}>{t(option.labelKey)}</option>)}
          </select>
        </label>

        <RangeInputs label={t("calories")} minValue={minCal} maxValue={maxCal} minPlaceholder={t("minCal")} maxPlaceholder={t("maxCal")} onMinChange={(value) => { setLoading(true); setMinCal(value) }} onMaxChange={(value) => { setLoading(true); setMaxCal(value) }} />
        <RangeInputs label={t("price")} minValue={minPrice} maxValue={maxPrice} minPlaceholder={t("minPrice")} maxPlaceholder={t("maxPrice")} onMinChange={(value) => { setLoading(true); setMinPrice(value) }} onMaxChange={(value) => { setLoading(true); setMaxPrice(value) }} />
      </div>
    </div>
  )

  return (
    <>
      <Nav />

      <section id="catalog" className="min-h-screen bg-white pt-20 pb-16">
        <div className="px-4 sm:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="pb-6"
          >
            <p className="font-nunito text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
              {t("eyebrow")}
            </p>
            <h1 className="font-playfair mt-3 text-3xl font-medium leading-tight text-neutral-900 sm:text-4xl">
              {t("title")}
            </h1>
            <p className="font-nunito mt-2 text-xs font-light text-neutral-500 sm:text-sm">
              {t("subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="pb-4"
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-9 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-neutral-400 focus:bg-white"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setLoading(true); setSearchInput(""); setSearch("") }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={15} />
                </button>
              )}
            </form>
          </motion.div>

          <div className="pb-3 sm:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen((isOpen) => !isOpen)}
              aria-expanded={filtersOpen}
              className="flex w-full items-center justify-between border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={15} />
                {filtersOpen ? t("hideFilters") : t("filters")}
                {hasActiveFilters && <span className="size-1.5 rounded-full bg-neutral-900" />}
              </span>
              <ChevronDown size={16} className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out sm:block sm:opacity-100 ${
              filtersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden sm:overflow-visible">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={2}
                className={`pb-4 transition-transform duration-300 ease-out ${filtersOpen ? "translate-y-0" : "-translate-y-2"} sm:translate-y-0`}
              >
                {filterPanel}
              </motion.div>
            </div>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
          >
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="size-7 animate-spin border-2 border-neutral-200 border-t-neutral-900" />
              </div>
            ) : menuItems.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {menuItems.map((item) => (
                    <CatalogMealCard
                      key={item.id}
                      {...item}
                      name={translateContent(item.name, locale)}
                      description={translateContent(item.description, locale)}
                    />
                  ))}
                </div>

                <div ref={sentinelRef} className="flex h-16 items-center justify-center">
                  {loadingMore && (
                    <div className="size-6 animate-spin border-2 border-neutral-200 border-t-neutral-900" />
                  )}
                </div>

                <p className="mt-2 text-center text-[11px] text-neutral-400">
                  {menuItems.length} / {total}
                </p>
              </>
            ) : (
              <div className="flex h-64 items-center justify-center border border-neutral-200 bg-neutral-50">
                <p className="font-nunito text-sm text-neutral-500">{t("noResults")}</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-lg transition-colors hover:bg-neutral-900 hover:text-white"
        >
          <ArrowUp size={18} />
        </button>
      )}

      <Footer />
    </>
  )
}
