"use client"

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import useSWRInfinite from "swr/infinite"
import { motion } from "framer-motion"
import { Search, X, ArrowUp, ArrowUpDown, Flame, Beef, Wheat, ChevronDown, ShoppingCart, Check } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { translateContent } from "@/constants/translations"
import { Nav } from "@/components/landing/Nav"
import { Footer } from "@/components/landing/Footer"
import { toDialogMeal } from "@/lib/meal-detail"
import { imageSrcSet, imageVariant } from "@/lib/images"
import { DirhamSign } from "@/components/ui/DirhamSign"
import type { MenuItem as DialogMeal } from "@/constants"
import { decodeRecipeIds } from "@/utils/catalogShare"
import { fetchRecipeList, recipeListUrl, type RecipeListResponse } from "@/hooks/useRecipes"
import { getCart, setCart } from "@/utils/cart"
import type { MealServingOption } from "@/constants"
import {
  categories,
  catValues,
  subValues,
  DEFAULT_CATEGORY,
  DEFAULT_SUBCATEGORY,
} from "./menu-categories"

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

const sortOptions = [
  { id: "default", labelKey: "default" },
  { id: "name", labelKey: "sortName" },
  { id: "name_desc", labelKey: "sortNameDesc" },
  { id: "calories", labelKey: "sortCalories" },
  { id: "calories_desc", labelKey: "sortCaloriesDesc" },
  { id: "price", labelKey: "sortPrice" },
  { id: "price_desc", labelKey: "sortPriceDesc" },
]

function MenuCardsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex overflow-hidden rounded-2xl border border-neutral-100 bg-white">
          <div className="flex flex-1 flex-col gap-2.5 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
            <div className="h-2.5 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-2.5 w-4/5 animate-pulse rounded bg-neutral-100" />
            <div className="flex gap-2 pt-3">
              <div className="h-3 w-12 animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-12 animate-pulse rounded bg-neutral-100" />
            </div>
            <div className="mt-auto flex items-center justify-between pt-3">
              <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
              <div className="h-8 w-24 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
          <div className="w-32 h-32 shrink-0 animate-pulse bg-neutral-100 sm:w-44 sm:h-44 lg:w-52 lg:h-52 mx-4 sm:mx-6 rounded-xl self-center" />
        </div>
      ))}
    </div>
  )
}

function MenuMealCard({
  item,
  name,
  description,
  onClick,
}: {
  item: MenuItem
  name: string
  description: string
  onClick: () => void
}) {
  const mt = useTranslations("meals")
  const [servingIndex, setServingIndex] = useState(0)
  const [servingOpen, setServingOpen] = useState(false)
  const [added, setAdded] = useState(false)

  const { servings, category } = item
  const activeServing = servings.length > 0 ? servings[Math.min(servingIndex, servings.length - 1)] : null
  const displayPrice = activeServing?.price ?? item.price
  const displayCalories = activeServing?.calories ?? item.calories
  const displayProtein = activeServing?.nutrition?.protein_g ?? item.protein
  const displayCarbs = activeServing?.nutrition?.carbs_g ?? item.carbs
  const imgSrc = item.image || fallbackImages[category] || "/drink_sample.svg"

  function handleAdd() {
    const cart = getCart()
    const key = activeServing ? `${name} (${activeServing.name ?? mt("servingFallback", { index: servingIndex + 1 })})` : name
    const existing = cart.find((entry) => entry.name === key)
    if (existing) {
      existing.qty += 1
    } else {
      cart.push({ name: key, price: displayPrice, qty: 1, image: imgSrc, recipeId: item.id, basePrice: displayPrice })
    }
    setCart(cart)
    window.dispatchEvent(new Event("cart-changed"))
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article
      onClick={onClick}
      className="group flex cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="min-w-0">
          <h3 className="font-nunito truncate text-base font-bold leading-tight text-neutral-900" title={name}>
            {name}
          </h3>
          {description && (
            <p className="font-nunito mt-1 line-clamp-2 text-xs text-neutral-500">{description}</p>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1 text-sm font-bold text-neutral-900">
            <Flame size={15} strokeWidth={2.5} className="text-orange-500" />
            {displayCalories}
          </span>
          <span className="flex items-center gap-0.5">
            <Beef size={11} className="text-macro-protein" />
            {displayProtein.toFixed(0)}g
          </span>
          <span className="flex items-center gap-0.5">
            <Wheat size={11} className="text-macro-carbs" />
            {displayCarbs.toFixed(0)}g
          </span>
        </div>

        {servings.length > 1 && (
          <div className="relative mt-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setServingOpen(!servingOpen) }}
              className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:border-neutral-300"
            >
              <span className="truncate">{activeServing?.name ?? mt("servingFallback", { index: servingIndex + 1 })}</span>
              <ChevronDown size={12} className={`shrink-0 transition-transform ${servingOpen ? "rotate-180" : ""}`} />
            </button>
            {servingOpen && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-md">
                {servings.map((serving, index) => (
                  <button
                    key={serving.id ?? index}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setServingIndex(index); setServingOpen(false) }}
                    className={`flex w-full items-center justify-between px-2.5 py-2 text-xs transition-colors hover:bg-neutral-50 ${
                      index === servingIndex ? "bg-neutral-50 font-semibold text-brand-900" : "text-neutral-600"
                    }`}
                  >
                    <span className="truncate">{serving.name ?? mt("servingFallback", { index: index + 1 })}</span>
                    {serving.price != null && (
                      <span className="ml-2 flex shrink-0 items-center gap-1">
                        <DirhamSign className="size-3" />
                        {serving.price}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-900">
            <DirhamSign className="size-3.5" />
            {displayPrice}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleAdd() }}
            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              added
                ? "bg-emerald-50 text-emerald-600"
                : "border border-neutral-900/15 text-neutral-800 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            {added ? (
              <>
                <Check size={13} />
                {mt("added")}
              </>
            ) : (
              <>
                <ShoppingCart size={13} />
                {mt("add")}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative w-32 h-32 shrink-0 overflow-hidden bg-neutral-100 sm:w-44 sm:h-44 lg:w-52 lg:h-52 mx-4 sm:mx-6 rounded-xl self-center">
        <img
          src={imageVariant(imgSrc, 600)}
          srcSet={imageSrcSet(imgSrc, [128, 600])}
          sizes="(max-width: 640px) 128px, (max-width: 1024px) 176px, 208px"
          alt={name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    </article>
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
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY)
  const [activeSub, setActiveSub] = useState<string | null>(DEFAULT_SUBCATEGORY)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sort, setSort] = useState("default")
  const [selected, setSelected] = useState<DialogMeal | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement | null>(null)
  const subCategoryRef = useRef<HTMLDivElement | null>(null)
  const checkoutHandledRef = useRef<string | null>(null)

  const activeCat = categories.find((c) => c.id === activeCategory)

  const buildUrl = useCallback((offset: number) => {
    const targetValue = sharedIds.length > 0
      ? undefined
      : activeCat?.subs
        ? (subValues[activeSub ?? ""] ?? activeCat.subs[0])
        : catValues[activeCategory]

    return recipeListUrl({
      ids: sharedIds.length > 0 ? sharedIdsKey : undefined,
      category: targetValue,
      search: search || undefined,
      sort: sort !== "default" ? sort : undefined,
      isActive: true,
      offset,
      limit: PAGE_SIZE,
    })
  }, [activeCategory, activeSub, search, sort, activeCat, sharedIdsKey, sharedIds.length])

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
    if (!isSwitching || isValidating) return
    const timer = setTimeout(() => setIsSwitching(false), 0)
    return () => clearTimeout(timer)
  }, [isSwitching, isValidating])

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
    setIsSwitching(true)
    setSearch(searchInput)
  }

  function handleCategoryClick(catId: string) {
    if (catId === activeCategory) return
    const category = categories.find((item) => item.id === catId)
    setIsSwitching(true)
    setActiveCategory(catId)
    setActiveSub(category?.subs?.[0] ?? null)
  }

  function handleSubClick(sub: string) {
    if (sub === activeSub) return
    setIsSwitching(true)
    setActiveSub(sub)
  }

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
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-brand-900 focus:ring-1 focus:ring-brand-900/20"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); setSearch("") }}
                  aria-label={t("clearAll")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={15} />
                </button>
              )}
            </form>
          </motion.div>

          <div className="mb-4 mt-4 min-w-0 overflow-x-auto pb-2">
            <div className="flex gap-4">
              {categories.map((cat) => {
                const label = ft(`cats.${cat.id}`)
                const active = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(cat.id)}
                    aria-label={label}
                    aria-pressed={active}
                    className={`flex shrink-0 flex-col items-center gap-1.5 transition-all duration-200 ${
                      active
                        ? "font-semibold text-brand-900"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    <Image
                      src={cat.image}
                      alt={label}
                      width={48}
                      height={48}
                      unoptimized
                      loading="lazy"
                      className={`size-12 rounded-xl object-cover transition-transform duration-200 ${
                        active ? "scale-110" : "hover:scale-110"
                      }`}
                    />
                    <span className="font-nunito text-xs font-medium leading-none">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-8 mt-1 flex flex-col items-end gap-1">
            <div ref={sortDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setSortDropdownOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={sortDropdownOpen}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none transition-colors hover:border-brand-900 focus:border-brand-900 focus:ring-1 focus:ring-brand-900/20"
              >
                <span className="font-nunito text-neutral-500">{t("sortBy")}</span>
                <span className="font-nunito text-sm font-semibold text-neutral-900">
                  {t(sortOptions.find((option) => option.id === sort)?.labelKey ?? sort)}
                </span>
                <ArrowUpDown
                  size={15}
                  className={`text-neutral-400 transition-transform duration-200 ${sortDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {sortDropdownOpen && (
                <div role="listbox" aria-label={t("sortBy")} className="absolute end-0 z-20 mt-1.5 w-40 rounded-xl border border-neutral-200 bg-white py-1.5 shadow-lg">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={option.id === sort}
                      onClick={() => { setIsSwitching(true); setSort(option.id); setSortDropdownOpen(false) }}
                      className={`flex w-full items-center px-3 py-1.5 text-start text-xs font-medium transition-colors ${
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
              className="no-scrollbar relative mb-2 -mx-4 min-w-0 snap-x snap-mandatory overflow-x-auto sm:-mx-6"
            >
              <div className="flex min-w-fit gap-4 px-4 sm:px-6">
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

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
          >
            {loading || isSwitching ? (
              <div aria-busy="true">
                <MenuCardsSkeleton />
              </div>
            ) : menuItems.length > 0 ? (
              <>
                <div className="flex flex-col gap-3">
                  {menuItems.map((item) => (
                    <MenuMealCard
                      key={item.id}
                      item={item}
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
