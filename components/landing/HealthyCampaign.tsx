"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { translateContent } from "@/constants/translations"
import type { MenuCategory, MenuItem } from "@/constants"
import { MENU_CATEGORIES } from "@/constants"
import { GalleryCard } from "@/components/landing/GalleryCard"
import { MealDetailDialog } from "@/components/ui/MealDetailDialog"

const ITEMS_PER_PAGE = 4

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

const categories = MENU_CATEGORIES.map((c) => c.value)

export function HealthyCampaign() {
  const t = useTranslations("healthy")
  const locale = useLocale()
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [active, setActive] = useState<MenuCategory>("chicken")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<MenuItem | null>(null)

  useEffect(() => {
    fetch("/api/recipe")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
        return data as Record<string, unknown>[]
      })
      .then((data) => {
        const items: MenuItem[] = data.map((r: Record<string, unknown>) => {
          const n = r.nutrition as Record<string, unknown> | null
          return {
            id: r.id as string,
            name: r.name as string,
            category: (r.category as MenuCategory) ?? "chicken",
            description: (r.description as string) ?? "",
            price: (r.price as number) ?? 0,
            calories: (r.calories as number) ?? 0,
            protein: (n?.protein_g as number) ?? 0,
            carbs: (n?.carbs_g as number) ?? 0,
            fats: (n?.fats_g as number) ?? 0,
            fiber: (n?.fiber_g as number) ?? 0,
            sugar: (n?.sugar_g as number) ?? 0,
            sodium: (n?.sodium_mg as number) ?? 0,
            image_path: (r.image_path as string) ?? null,
            ingredients: (r.ingredients as MenuItem["ingredients"]) ?? [],
          }
        })
        setAllItems(items)
      })
      .catch((e) => console.error("[HEALTHY_CAMPAIGN] Failed to fetch recipes:", e.message || e))
  }, [])

  const items = allItems.filter((item) => item.category === active)
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
  const start = page * ITEMS_PER_PAGE
  const visible = items.slice(start, start + ITEMS_PER_PAGE)

  return (
    <section id="diet" className="overflow-hidden px-8 py-32 max-sm:px-4 max-sm:py-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mx-auto max-w-5xl"
      >
        <motion.div variants={fadeUp} custom={0} className="flex justify-center">
          <img
            src="/logo-horizontal.png"
            alt="CookConnect"
            className="h-20 object-contain opacity-90 max-sm:h-14"
          />
        </motion.div>

        <motion.p
          variants={fadeUp}
          custom={1}
          className="font-nunito mt-6 text-center text-base text-black/40 max-sm:text-sm"
        >
          {t("tagline")}
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={2}
          className="relative mt-12 flex items-center overflow-visible rounded-[2rem] bg-gradient-to-br from-brand-900 to-[#0d6e3f] px-12 py-14 max-sm:px-6 max-sm:py-10"
        >
          <div className="relative z-10 w-[55%] max-sm:w-full">
            <h2 className="font-nunito text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl max-sm:text-2xl">
              {t("campaignTitle")}
            </h2>
            <p className="font-nunito mt-4 max-w-sm text-base leading-relaxed text-white/60 max-sm:text-sm">
              {t("campaignBody")}
            </p>
            <a
              href="#subscription"
              className="font-nunito mt-6 inline-flex items-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              {t("campaignCta")}
            </a>
          </div>

          <div className="absolute bottom-0 right-0 top-0 z-0 flex w-[55%] items-end justify-end overflow-visible max-sm:hidden">
            <img
              src="/health-section.png"
              alt={t("imgAlt")}
              className="mr-[-10%] h-[130%] w-auto translate-y-[5%] object-contain drop-shadow-2xl max-sm:mr-[-20%] max-sm:h-[100%]"
            />
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={3} className="mt-24 max-sm:mt-16">
          <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
            {t("sectionLabel")}
          </span>
          <h3 className="font-playfair mt-4 text-4xl font-medium leading-tight text-black sm:text-5xl max-sm:text-3xl">
            {t("didYouKnow")}
          </h3>
          <div className="mt-6 h-px w-12 bg-black/20" />
          <div className="mt-10 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-6 rounded-xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:flex-row">
              <img
                src="/healthy-section/section-1.png"
                alt=""
                className="w-32 h-48 shrink-0 rounded object-cover max-sm:w-24 max-sm:h-36"
              />
              <p className="font-nunito text-xl leading-loose text-black/50 max-sm:text-lg">{t("fact1")}</p>
            </div>
            <div className="flex flex-col items-center gap-6 rounded-xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:flex-row">
              <img
                src="/healthy-section/section-2.png"
                alt=""
                className="w-32 h-48 shrink-0 rounded object-cover max-sm:w-24 max-sm:h-36"
              />
              <p className="font-nunito text-xl leading-loose text-black/50 max-sm:text-lg">{t("fact2")}</p>
            </div>
            <div className="flex flex-col items-center gap-6 rounded-xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:flex-row">
              <img
                src="/healthy-section/section-3.png"
                alt=""
                className="w-32 h-48 shrink-0 rounded object-cover max-sm:w-24 max-sm:h-36"
              />
              <p className="font-nunito text-xl leading-loose text-black/50 max-sm:text-lg">{t("fact3")}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={4} className="mt-24 max-sm:mt-16">
          <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
            {t("pantryLabel")}
          </span>
          <h3 className="font-playfair mt-4 text-4xl font-medium leading-tight text-black sm:text-5xl max-sm:text-3xl">
            {t("pantryTitle")}
          </h3>
        </motion.div>

        <div className="mt-16 max-sm:mt-10">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1">
            {categories.map((cat) => {
              const label = translateContent(MENU_CATEGORIES.find((c) => c.value === cat)!.label, locale)
              const isActive = active === cat
              return (
                <button
                  key={cat}
                  onClick={() => { setActive(cat); setPage(0) }}
                  className={`font-nunito shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all max-sm:text-xs max-sm:px-3 max-sm:py-1.5 ${
                    isActive
                      ? "bg-brand-900 text-white shadow-sm"
                      : "text-black/40 hover:text-black/70"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="relative mt-8">
            {totalPages > 1 && (
              <>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="absolute -left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg disabled:opacity-30 max-sm:-left-3 max-sm:size-8"
                >
                  <ChevronLeft size={18} className="text-black/60 max-sm:size-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="absolute -right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg disabled:opacity-30 max-sm:-right-3 max-sm:size-8"
                >
                  <ChevronRight size={18} className="text-black/60 max-sm:size-4" />
                </button>
              </>
            )}
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 max-sm:flex max-sm:gap-4 max-sm:overflow-x-auto max-sm:pb-2">
              <AnimatePresence mode="wait">
                {visible.length > 0 ? (
                  visible.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                      className="flex justify-center max-sm:shrink-0"
                    >
                      <GalleryCard
                        name={translateContent(item.name, locale)}
                        price={item.price}
                        calories={item.calories}
                        protein={item.protein}
                        carbs={item.carbs}
                        fats={item.fats}
                        description={translateContent(item.description, locale)}
                        image={item.image_path ?? `https://picsum.photos/seed/${item.id}/400/280`}
                        onClick={() => setSelected(item)}
                        className="w-full max-w-[241px]"
                      />
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full flex h-[290px] flex-col items-center justify-center gap-3 text-black/30"
                  >
                    <span className="text-4xl">🍽️</span>
                    <p className="text-sm">{t("emptyState")}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="mt-10 flex justify-center max-sm:mt-6">
            <Link
              href="/employee/meals"
              className="font-nunito inline-flex items-center gap-2 rounded-xl border border-brand-900/30 px-6 py-3 text-sm font-semibold text-brand-900 drop-shadow-md transition-all hover:bg-brand-900/5 max-sm:px-5 max-sm:py-2.5 max-sm:text-xs"
            >
              {t("viewMenu")}
            </Link>
          </div>
        </div>
      </motion.div>

      <MealDetailDialog item={selected} onClose={() => setSelected(null)} />
    </section>
  )
}