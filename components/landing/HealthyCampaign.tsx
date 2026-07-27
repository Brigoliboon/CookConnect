"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { MenuCategory, MenuItem } from "@/constants"
import { getMenuByCategory, MENU_CATEGORIES } from "@/constants"
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
  const [active, setActive] = useState<MenuCategory>("chicken")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const items = getMenuByCategory(active)
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
  const start = page * ITEMS_PER_PAGE
  const visible = items.slice(start, start + ITEMS_PER_PAGE)

  return (
    <section id="meals" className="overflow-hidden px-8 py-32">
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
            className="h-20 object-contain opacity-90"
          />
        </motion.div>

        <motion.p
          variants={fadeUp}
          custom={1}
          className="font-nunito mt-6 text-center text-base text-black/40"
        >
          Fresh ingredients, vibrant meals — eat the rainbow every day.
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={2}
          className="relative mt-12 flex items-center overflow-visible rounded-[2rem] bg-gradient-to-br from-brand-900 to-[#0d6e3f] px-12 py-14"
        >
          <div className="relative z-10 w-[55%]">
            <h2 className="font-nunito text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              Eat Healthy,
              <br />
              Stay Healthy.
            </h2>
            <p className="font-nunito mt-4 max-w-sm text-base leading-relaxed text-white/60">
              Every plate is built around fresh produce, lean proteins,
              and whole grains — because the best fuel comes from nature.
            </p>
            <a
              href="#subscription"
              className="font-nunito mt-6 inline-flex items-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              View Healthy Plan
            </a>
          </div>

          <div className="absolute bottom-0 right-0 top-0 z-0 flex w-[55%] items-end justify-end overflow-visible">
            <img
              src="/health-section.png"
              alt="Fresh salad bowl"
              className="mr-[-10%] h-[130%] w-auto translate-y-[5%] object-contain drop-shadow-2xl"
            />
          </div>
        </motion.div>

        <div className="mt-16">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1">
            {categories.map((cat) => {
              const label = MENU_CATEGORIES.find((c) => c.value === cat)!.label
              const isActive = active === cat
              return (
                <button
                  key={cat}
                  onClick={() => { setActive(cat); setPage(0) }}
                  className={`font-nunito shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
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
                  className="absolute -left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg disabled:opacity-30"
                >
                  <ChevronLeft size={18} className="text-black/60" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="absolute -right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg disabled:opacity-30"
                >
                  <ChevronRight size={18} className="text-black/60" />
                </button>
              </>
            )}
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence mode="wait">
                {visible.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <GalleryCard
                      name={item.name}
                      price={item.price}
                      calories={item.calories}
                      protein={item.protein}
                      carbs={item.carbs}
                      fats={item.fats}
                      description={item.description}
                      image={`https://picsum.photos/seed/${item.id}/400/280`}
                      onClick={() => setSelected(item)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/employee/meals"
              className="font-nunito inline-flex items-center gap-2 rounded-xl border border-brand-900/30 px-6 py-3 text-sm font-semibold text-brand-900 drop-shadow-md transition-all hover:bg-brand-900/5"
            >
              View Full Menu
            </Link>
          </div>
        </div>
      </motion.div>

      <MealDetailDialog item={selected} onClose={() => setSelected(null)} />
    </section>
  )
}
