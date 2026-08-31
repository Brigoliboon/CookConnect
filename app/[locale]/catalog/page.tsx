"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Search, X, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { translateContent } from "@/constants/translations"
import { Nav } from "@/components/landing/Nav"
import { Footer } from "@/components/landing/Footer"
import { CatalogMealCard } from "@/components/landing/CatalogMealCard"
import type { MealServingOption } from "@/constants"

const PAGE_SIZE = 12

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
      <p className="font-nunito text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{label}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input type="number" min="0" value={minValue} onChange={(event) => onMinChange(event.target.value)} placeholder={minPlaceholder} aria-label={minPlaceholder} className="min-w-0 border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/40" />
        <span className="text-xs text-white/35">–</span>
        <input type="number" min="0" value={maxValue} onChange={(event) => onMaxChange(event.target.value)} placeholder={maxPlaceholder} aria-label={maxPlaceholder} className="min-w-0 border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/40" />
      </div>
    </div>
  )
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index)
  if (currentPage <= 2) return [0, 1, 2, "ellipsis", totalPages - 1]
  if (currentPage >= totalPages - 3) return [0, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1]
  return [0, "ellipsis", currentPage, "ellipsis", totalPages - 1]
}

export default function CatalogPage() {
  const t = useTranslations("catalog")
  const ft = useTranslations("featured")
  const locale = useLocale()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeSub, setActiveSub] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState("default")
  const [minCal, setMinCal] = useState("")
  const [maxCal, setMaxCal] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")

  const activeCat = categories.find((c) => c.id === activeCategory)
  const hasActiveFilters = search !== "" || activeCategory !== "all" || sort !== "default" || minCal !== "" || maxCal !== "" || minPrice !== "" || maxPrice !== ""

  const buildUrl = useCallback(() => {
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
    params.set("offset", String(page * PAGE_SIZE))
    params.set("limit", String(PAGE_SIZE))
    return `/api/recipe?${params.toString()}`
  }, [activeCategory, activeSub, search, page, sort, minCal, maxCal, minPrice, maxPrice, activeCat])

  useEffect(() => {
    const controller = new AbortController()
    fetch(buildUrl(), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch recipes")
        return res.json()
      })
      .then((json) => {
        if (controller.signal.aborted) return
        const raw = json.data ?? json
        const count = json.total ?? (Array.isArray(raw) ? raw.length : 0)
        const items = Array.isArray(raw) ? raw.map(mapRecipe) : []
        setMenuItems(items)
        setTotal(count)
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.error("[CATALOG] Failed to fetch recipes:", e)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [buildUrl])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginationItems = getPaginationItems(page, totalPages)

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchInput === search) return
    setLoading(true)
    setSearch(searchInput)
    setPage(0)
  }

  function handleCategoryClick(catId: string) {
    if (catId === activeCategory) return
    const category = categories.find((item) => item.id === catId)
    setLoading(true)
    setActiveCategory(catId)
    setActiveSub(category?.subs?.[0] ?? null)
    setPage(0)
  }

  function handleSubClick(sub: string) {
    if (sub === activeSub) return
    setLoading(true)
    setActiveSub(sub)
    setPage(0)
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
    setPage(0)
  }

  function handlePageChange(nextPage: number) {
    if (nextPage === page) return
    setLoading(true)
    setPage(nextPage)
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const filterPanel = (
    <div className="border border-white/15 bg-black/35 p-4 backdrop-blur-md sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-nunito text-sm font-semibold text-white">{t("filters")}</p>
          <p className="font-nunito mt-0.5 text-xs text-white/45">{t("filterHint")}</p>
        </div>
        <button
          type="button"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          className="border border-white/15 px-3 py-1.5 text-xs font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          {t("clearAll")}
        </button>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="font-nunito text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{t("categories")}</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? "border-white bg-white text-neutral-900"
                  : "border-white/15 bg-white/5 text-white/65 hover:bg-white/15 hover:text-white"
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
                    ? "border-white/50 bg-white/20 text-white"
                    : "border-white/10 bg-transparent text-white/50 hover:border-white/25 hover:text-white"
                }`}
              >
                {ft(`subs.${sub}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-3">
        <label className="block">
          <span className="block font-nunito text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{t("sortBy")}</span>
          <select
            value={sort}
            onChange={(e) => { setLoading(true); setSort(e.target.value); setPage(0) }}
            className="mt-2 w-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
          >
            {sortOptions.map((option) => <option key={option.id} value={option.id} className="bg-neutral-900">{t(option.labelKey)}</option>)}
          </select>
        </label>

        <RangeInputs label={t("calories")} minValue={minCal} maxValue={maxCal} minPlaceholder={t("minCal")} maxPlaceholder={t("maxCal")} onMinChange={(value) => { setLoading(true); setMinCal(value); setPage(0) }} onMaxChange={(value) => { setLoading(true); setMaxCal(value); setPage(0) }} />
        <RangeInputs label={t("price")} minValue={minPrice} maxValue={maxPrice} minPlaceholder={t("minPrice")} maxPlaceholder={t("maxPrice")} onMinChange={(value) => { setLoading(true); setMinPrice(value); setPage(0) }} onMaxChange={(value) => { setLoading(true); setMaxPrice(value); setPage(0) }} />
      </div>
    </div>
  )

  return (
    <>
      <Nav />

      <section id="catalog" className="relative min-h-screen bg-[#aa9a88] pt-20 pb-16">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "url(/meal-backgrounds/salad.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/90" />

        <div className="relative z-10 px-4 sm:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="pb-6"
          >
            <p className="font-nunito text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
              {t("eyebrow")}
            </p>
            <h1 className="font-playfair mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
              {t("title")}
            </h1>
            <p className="font-nunito mt-2 text-xs font-light text-white/55 sm:text-sm">
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
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full border border-white/15 bg-white/10 py-2 pl-9 pr-9 text-sm text-white placeholder-white/40 outline-none backdrop-blur-sm transition-colors focus:border-white/30 focus:bg-white/15"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setLoading(true); setSearchInput(""); setSearch(""); setPage(0) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
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
              className="flex w-full items-center justify-between border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-medium text-white backdrop-blur-sm"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={15} />
                {filtersOpen ? t("hideFilters") : t("filters")}
                {hasActiveFilters && <span className="size-1.5 rounded-full bg-white" />}
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
                <div className="size-7 animate-spin border-2 border-white/30 border-t-white" />
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

                {totalPages > 1 && (
                  <div className="mt-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                    <button
                      onClick={() => handlePageChange(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="flex shrink-0 items-center gap-1 border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 sm:px-3"
                    >
                      <ChevronLeft size={14} />
                      <span className="max-sm:sr-only">{t("prev")}</span>
                    </button>

                    <div className="flex min-w-0 items-center justify-center gap-1">
                      {paginationItems.map((item, index) => item === "ellipsis" ? (
                        <span key={`ellipsis-${index}`} className="flex h-7 w-5 items-center justify-center text-xs text-white/45" aria-hidden>…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => handlePageChange(item)}
                          className={`h-7 w-7 shrink-0 text-xs font-medium transition-colors ${
                            page === item
                              ? "bg-white text-neutral-900"
                              : "text-white/50 hover:bg-white/10 hover:text-white/80"
                          }`}
                        >
                          {item + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex shrink-0 items-center gap-1 border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 sm:px-3"
                    >
                      <span className="max-sm:sr-only">{t("next")}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                <p className="mt-3 text-center text-[11px] text-white/30">
                  {t("showing", { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, total), total })}
                </p>
              </>
            ) : (
              <div className="flex h-64 items-center justify-center border border-white/10 bg-white/5">
                <p className="font-nunito text-sm text-white/50">{t("noResults")}</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  )
}
