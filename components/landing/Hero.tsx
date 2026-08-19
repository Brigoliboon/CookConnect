"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "framer-motion"
import { translateContent } from "@/constants/translations"
import { useLocale } from "next-intl"
import { MealCard } from "@/components/landing/MealCard"

const featured = [
  { name: "Beef Steak", price: 48, image: "/menus/beef-steak.png", calories: 420, protein: 30, carbs: 25, fats: 22, description: "Thinly sliced ribeye stir-fried with bell peppers, broccoli, and snap peas in a savory garlic-soy glaze." },
  { name: "Garden Salad", price: 26, image: "/menus/salad.png", calories: 280, protein: 8, carbs: 12, fats: 22, description: "Fresh tomatoes, cucumbers, red onions, Kalamata olives, and bell peppers tossed with oregano vinaigrette." },
  { name: "Salmon Salad", price: 42, image: "/menus/salmon-salad.png", calories: 420, protein: 40, carbs: 8, fats: 26, description: "Fresh Atlantic salmon fillet grilled to perfection, drizzled with a creamy lemon dill sauce." },
  { name: "Shrimp Salad", price: 38, image: "/menus/shrimp-salad.png", calories: 310, protein: 28, carbs: 6, fats: 20, description: "Plump shrimp sautéed in a luscious garlic butter sauce with white wine, lemon juice, and fresh parsley." },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const } },
}

export function Hero() {
  const t = useTranslations("hero")
  const locale = useLocale()
  const translated = featured.map((item) => ({
    ...item,
    name: translateContent(item.name, locale),
    description: translateContent(item.description, locale),
  }))

  return (
    <section className="relative min-h-[122vh] overflow-hidden max-h-[122vh] bg-black max-sm:min-h-screen">
      <div
        className="absolute h-[122vh] inset-0 bg-cover bg-center opacity-40 max-sm:h-screen"
        style={{ backgroundImage: "url(/bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />

      <div className="relative z-10 flex min-h-screen flex-col justify-between px-8 pt-28 max-sm:px-4 max-sm:pt-16">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid items-end gap-16 lg:grid-cols-2 max-sm:gap-8"
        >
          <motion.div variants={fadeUp}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
              {t("eyebrow")}
            </p>
            <h1 className="font-playfair mt-5 text-5xl font-medium leading-tight text-white sm:text-6xl lg:text-7xl max-sm:text-4xl">
              {t("title")}
            </h1>
            <p className="font-nunito mx-auto mt-6 text-sm leading-relaxed text-white/50">
              {t("subtitle")}
              {t("subtitle2")}
            </p>
            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-4 max-sm:flex-col max-sm:items-start">
              <Link
                href="#subscription"
                className="rounded-xl bg-white px-7 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 max-sm:w-full max-sm:text-center"
              >
                {t("cta")}
              </Link>
              <Link
                href="#meals"
                className="rounded-xl border border-white/20 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 max-sm:w-full max-sm:text-center"
              >
                {t("ctaSecondary")}
              </Link>
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-end justify-end max-sm:justify-center">
            <img className="w-full hidden sm:flex max-w-lg object-contain" src="/hero-menu.png" alt={t("imageAlt")} />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="flex gap-10 overflow-y-hidden overflow-x-auto pb-2 justify-center max-sm:-mx-4 max-sm:flex-nowrap max-sm:justify-start max-sm:overflow-x-auto max-sm:px-4 max-sm:snap-x max-sm:snap-mandatory items-stretch">
            {translated.map((item) => (
              <MealCard key={item.name} {...item} />
            ))}
          </motion.div>
      </div>
    </section>
  )
}