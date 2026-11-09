"use client"

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import useSWRInfinite from "swr/infinite"
import { motion } from "framer-motion"
import { Search, X, ArrowUp, ArrowUpDown } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { translateContent } from "@/constants/translations"
import { Nav } from "@/components/landing/Nav"
import { Footer } from "@/components/landing/Footer"
import { CatalogMealCard } from "@/components/landing/CatalogMealCard"
import { toDialogMeal } from "@/lib/meal-detail"
import type { MenuItem as DialogMeal } from "@/constants"
import { decodeRecipeIds } from "@/utils/catalogShare"
import { fetchRecipeList, recipeListUrl, type RecipeListResponse } from "@/hooks/useRecipes"
import { getCart, setCart } from "@/utils/cart"
import type { MealServingOption } from "@/constants"

const MealDetailDialog = dynamic(
  () => import("@/components/ui/MealDetailDialog").then((mod) => mod.MealDetailDialog),
  { ssr: false },
)

const PAGE_SIZE = 24

/** Checkout links (?ids=&checkout=) add to cart once per mount, even under StrictMode. */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.08 },
  }),
}

export interface MenuItem {
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
  { id: "meals", label: "Meals", image: "/menu-icons/meals.webp", subs: ["beef", "chicken", "seafood", "soup", "biryani", "risotto", "vegetable", "breakfast"] },
  { id: "salad", label: "Salad", image: "/menu-icons/salad.webp" },
  { id: "rice-sides", label: "Rice & Sides", image: "/menu-icons/rice-sides.webp" },
  { id: "platters", label: "Platters", image: "/menu-icons/platters.webp" },
  { id: "pasta", label: "Pasta", image: "/menu-icons/pasta.webp" },
  { id: "wraps", label: "Wraps", image: "/menu-icons/wraps.webp" },
  { id: "pizza", label: "Pizza", image: "/menu-icons/pizza.webp" },
  { id: "burgers", label: "Burgers", image: "/menu-icons/burgers.webp" },
  { id: "desserts", label: "Desserts", image: "/menu-icons/desserts.webp" },
  { id: "drinks", label: "Drinks", image: "/menu-icons/drinks.webp", subs: ["smoothie", "juice", "beverages"] },
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
        <input type="number" min="0" value={minValue} onChange={(event) => onMinChange(event.target.value)} placeholder={minPlaceholder} aria-label={minPlaceholder} className="min-w-0 border border-neutral-200 bg-white px-2.5 py-2 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-brand-900 focus:ring-1 focus:ring-brand-900/20" />
        <span className="text-xs text-neutral-400">–</span>
        <input type="number" min="0" value={maxValue} onChange={(event) => onMaxChange(event.target.value)} placeholder={maxPlaceholder} aria-label={maxPlaceholder} className="min-w-0 border border-neutral-200 bg-white px-2.5 py-2 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-brand-900 focus:ring-1 focus:ring-brand-900/20" />
      </div>
    </div>
  )
}

export default function MenuClient({
  initialData,
  idsParam = null,
  checkoutRequested = false,
}: {
  initialData?: RecipeListResponse
  idsParam?: string | null
  checkoutRequested?: boolean
}) {
  return (
    <Suspense>
      <CatalogContent
        initialData={initialData}
        idsParam={idsParam}
        checkoutRequested={checkoutRequested}
      />
    </Suspense>
  )
}

function CatalogContent({
  initialData,
  idsParam = null,
  checkoutRequested = false,
}: {
  initialData?: RecipeListResponse
  idsParam?: string | null
  checkoutRequested?: boolean
}) {
  const t = useTranslations("catalog")
  const ft = useTranslations("featured")
  const locale = useLocale()
  const sharedIds = useMemo(() => decodeRecipeIds(idsParam), [idsParam])
  const sharedIdsKey = useMemo(() => [...sharedIds].sort().join(","), [sharedIds])
  const [showTop, setShowTop] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [activeCategory, setActiveCategory] = useState("meals")
  const [activeSub, setActiveSub] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [filtersOpen] = useState(false)
  const [sort, setSort] = useState("default")
  const [minCal, setMinCal] = useState("")
  const [maxCal, setMaxCal] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [selected, setSelected] = useState<DialogMeal | null>(null)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement | null>(null)
  const subCategoryRef = useRef<HTMLDivElement | null>(null)
  const checkoutHandledRef = useRef<string | null>(null)

  const activeCat = categories.find((c) => c.id === activeCategory)
  const hasActiveFilters = search !== "" || activeCategory !== "meals" || sort !== "default" || minCal !== "" || maxCal !== "" || minPrice !== "" || maxPrice !== ""

  const buildUrl = useCallback((offset: number) => {
    const targetValue = activeCat?.subs ? (subValues[activeSub ?? ""] ?? activeCat.subs[0]) : catValues[activeCategory]

    return recipeListUrl({
      ids: sharedIds.length > 0 ? sharedIdsKey : undefined,
      category: targetValue,
      search: search || undefined,
      sort: sort !== "default" ? sort : undefined,
      minCalories: minCal || undefined,
      maxCalories: maxCal || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      isActive: true,
      offset,
      limit: PAGE_SIZE,
    })
  }, [activeCategory, activeSub, search, sort, minCal, maxCal, minPrice, maxPrice, activeCat, sharedIdsKey, sharedIds.length])

  const getKey = useCallback((index: number, previousPage: RecipeListResponse | null) => {
    if (idsParam && sharedIds.length === 0) return null
    if (previousPage && previousPage.data.length < PAGE_SIZE) return null
    return buildUrl(index * PAGE_SIZE)
  }, [buildUrl, idsParam, sharedIds.length])

  const { data: pages, size, setSize, isLoading, isValidating } = useSWRInfinite<RecipeListResponse>(
    getKey,
    fetchRecipeList,
    {
      fallbackData: initialData ? [initialData] : undefined,
      dedupingInterval: 30_000,
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      parallel: false,
    },
  )

  const menuItems = useMemo(
    () => (pages ?? []).flatMap((page) => page.data).map((recipe) => mapRecipe(recipe as unknown as Record<string, unknown>)),
    [pages],
  )
  const total = pages?.[0]?.total ?? 0
  const loading = isLoading && menuItems.length === 0
  const loadingMore = isValidating && size > 1
  const hasMore = menuItems.length < total

  useEffect(() => {
    if (!checkoutRequested || loading || loadingMore || menuItems.length === 0 || hasMore) return
    if (checkoutHandledRef.current === sharedIdsKey) return
    checkoutHandledRef.current = sharedIdsKey
    const cart = getCart()
    for (const item of menuItems) {
      const firstServing = item.servings[0]
      const servingName = firstServing?.name ?? null
      const name = translateContent(item.name, locale)
      const key = servingName ? `${name} (${servingName})` : name
      const existing = cart.find((entry) => entry.name === key)
      if (existing) {
        existing.qty += 1
      } else {
        cart.push({ name: key, price: firstServing?.price ?? item.price, qty: 1, image: item.image, recipeId: item.id, basePrice: firstServing?.price ?? item.price })
      }
    }
    setCart(cart)
    window.dispatchEvent(new Event("cart-changed"))
    window.dispatchEvent(new Event("open-cart"))
  }, [checkoutRequested, loading, loadingMore, hasMore, menuItems, sharedIdsKey, locale])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!sortDropdownOpen || !sortDropdownRef.current) return
      if (sortDropdownRef.current.contains(e.target as Node)) return
      setSortDropdownOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [sortDropdownOpen])

  useEffect(() => {
    if (!checkoutRequested || !hasMore || loading || loadingMore) return
    setSize((current) => current + 1)
  }, [checkoutRequested, hasMore, loading, loadingMore, setSize])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry.isIntersecting || loadingMore || !hasMore) return
        setSize((current) => current + 1)
      },
      { rootMargin: "400px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading, loadingMore, hasMore, setSize])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchInput === search) return
    setSearch(searchInput)
  }

  function handleCategoryClick(catId: string) {
    if (catId === activeCategory) return
    const category = categories.find((item) => item.id === catId)
    setActiveCategory(catId)
    setActiveSub(category?.subs?.[0] ?? null)
  }

  function handleSubClick(sub: string) {
    if (sub === activeSub) return
    setActiveSub(sub)
  }

  function handleClearFilters() {
    if (!hasActiveFilters) return
    setActiveCategory("meals")
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
    <div className="border border-neutral-200 bg-white p-4 sm:p-5 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-nunito text-sm font-semibold text-neutral-900">{t("filters")}</p>
          <p className="font-nunito mt-0.5 text-xs text-neutral-500">{t("filterHint")}</p>
        </div>
        <button
          type="button"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          className="border border-neutral-200 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {t("clearAll")}
        </button>
      </div>

      <div className="mt-5 border-t border-neutral-100 pt-4">
        <p className="font-nunito text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{t("categories")}</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === "all" ? "/menu" : `/menu/${cat.id}`}
              onClick={(e) => { e.preventDefault(); handleCategoryClick(cat.id) }}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
              }`}
            >
              {ft(`cats.${cat.id}`)}
            </Link>
          ))}
        </div>
        {activeCat?.subs && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeCat.subs.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => handleSubClick(sub)}
                className={`rounded-xl border px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
            onChange={(e) => setSort(e.target.value)}
            className="mt-2 w-full border border-neutral-200 bg-white px-3 py-2 rounded-xl text-sm text-neutral-900 outline-none transition-colors focus:border-brand-900 focus:ring-1 focus:ring-brand-900/20"
          >
            {sortOptions.map((option) => <option key={option.id} value={option.id}>{t(option.labelKey)}</option>)}
          </select>
        </label>

        <RangeInputs label={t("calories")} minValue={minCal} maxValue={maxCal} minPlaceholder={t("minCal")} maxPlaceholder={t("maxCal")} onMinChange={setMinCal} onMaxChange={setMaxCal} />
        <RangeInputs label={t("price")} minValue={minPrice} maxValue={maxPrice} minPlaceholder={t("minPrice")} maxPlaceholder={t("maxPrice")} onMinChange={setMinPrice} onMaxChange={setMaxPrice} />
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
            custom={1}
            className="pb-4"
          >
            <div className="flex items-center gap-3 flex-row sm:flex-row">
              <form onSubmit={handleSearchSubmit} className="flex-1 relative mt-3 sm:mt-0">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full border border-neutral-200 bg-white pl-10 pr-10 py-2.5 rounded-full text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-brand-900 focus:ring-1 focus:ring-brand-900/20"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setSearch("") }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </form>
            </div>
          </motion.div>

          <div className="mt-4 mb-4 overflow-x-auto pb-2 min-w-0">
            <div className="flex gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`flex flex-col items-center gap-1.5 shrink-0 transition-all duration-200 ${
                    activeCategory === cat.id
                      ? "text-brand-900 font-semibold"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    width={48}
                    height={48}
                    unoptimized
                    loading="lazy"
                    className={`size-12 rounded-xl object-cover transition-transform duration-200 ${
                      activeCategory === cat.id ? "scale-110" : "hover:scale-110"
                    }`}
                  />
                  <span className="font-nunito text-xs font-medium leading-none">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-1 mb-8 flex flex-col items-end gap-1">
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setSortDropdownOpen((o) => !o)}
                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-900 outline-none transition-colors hover:border-brand-900 focus:border-brand-900"
              >
                <p className=" flex font-nunito text-[14px] font-sm text-neutral-500">sort by
                <ArrowUpDown size={15} className="ml-1 text-neutral-400 transition-transform duration-200" />
                </p>
                <span className="flex items-center gap-2">
                  {t(sortOptions.find((o) => o.id === sort)?.labelKey ?? sort)}
                </span>
              </button>
              {sortDropdownOpen && (
                <div ref={sortDropdownRef} className="absolute right-0 mt-1.5 w-32 border border-neutral-200 bg-white rounded-xl shadow-lg py-1.5 z-20">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => { setSort(option.id); setSortDropdownOpen(false) }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                        option.id === sort
                          ? "bg-brand-900/5 text-brand-900"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      }`}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {activeCat?.subs && activeCat.subs.length > 0 && (
            <div
              ref={subCategoryRef}
              className="relative w-[100vw] mx-[calc(50%-50vw)] overflow-x-auto snap-x snap-mandatory mb-2 min-w-0 no-scrollbar"
            >
              <div className="absolute bottom-[-10px] left-0 right-0 h-[10px] bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
              <div className="flex gap-4 min-w-fit px-4">
                {activeCat.subs.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    data-sub={sub}
                    onClick={() => {
                      handleSubClick(sub)
                      requestAnimationFrame(() => {
                        if (subCategoryRef.current) {
                          const btn = subCategoryRef.current.querySelector(`[data-sub="${sub}"]`)
                          if (btn) {
                            ;(btn as HTMLElement).scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                              inline: "center",
                            })
                          }
                        }
                      })
                    }}
                    className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors duration-300 border-b-2 snap-center ${
                      activeSub === sub
                        ? "border-brand-900 text-brand-900"
                        : "border-transparent text-neutral-500 hover:text-neutral-900"
                    } whitespace-nowrap`}
                  >
                    {ft(`subs.${sub}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
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
                      onClick={() =>
                        setSelected(
                          toDialogMeal({
                            ...item,
                            name: translateContent(item.name, locale),
                            description: translateContent(item.description, locale),
                          }),
                        )
                      }
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

      {selected && <MealDetailDialog item={selected} onClose={() => setSelected(null)} />}

      <Footer />
    </>
  )
}
