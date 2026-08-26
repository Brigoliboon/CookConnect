"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import { translateContent } from "@/constants/translations"
import { PremiumGallery } from "@/components/landing/PremiumGallery"
import { MealCard } from "@/components/landing/MealCard"
import type { MealServingOption } from "@/constants"

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  calories: number
  protein: number
  carbs: number
  fats: number
  image: string
  description: string
  servings: MealServingOption[]
}

const fallbackImages: Record<string, string> = {
  beef: "/menus/beef-steak.png",
  chicken: "/menus/beef-steak.png",
  seafood: "/menus/salmon-salad.png",
  salad: "/menus/salad.png",
  wrap: "/menus/salmon-salad.png",
  breakfast: "/menus/salad.png",
  pasta: "/menus/salad.png",
  soup: "/menus/salad.png",
  pizza: "/menus/salmon-salad.png",
  burgers: "/menus/beef-steak.png",
  drinks: "/drink_sample.svg",
  biryani: "/menus/beef-steak.png",
  risotto: "/menus/beef-steak.png",
  smoothie: "/drink_sample.svg",
  juice: "/drink_sample.svg",
  beverages: "/drink_sample.svg",
  desserts: "/drink_sample.svg",
  "rice-sides": "/menus/beef-steak.png",
  platters: "/drink_sample.svg",
  vegetable: "/menus/salad.png",
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
    price: first?.price ?? 0,
    calories: first?.calories ?? 0,
    protein: first?.nutrition?.protein_g ?? 0,
    carbs: first?.nutrition?.carbs_g ?? 0,
    fats: first?.nutrition?.fats_g ?? 0,
    image: (r.image_path as string) ?? fallbackImages[category] ?? "/drink_sample.svg",
    description: (r.description as string) ?? "",
    servings,
  }
}

const categories = [
  { id: "meals", image: "/menus/beef-steak.png", subs: ["beef", "chicken", "seafood", "soup", "biryani", "risotto", "vegetable", "breakfast"] },
  { id: "salad", image: "/menus/salad.png" },
  { id: "rice-sides", image: "/icons/ricensides_model.svg" },
  { id: "platters", image: "/icons/platters_model.svg" },
  { id: "pasta", image: "/icons/pasta_model.svg" },
  { id: "wraps", image: "/icons/wraps_model.svg" },
  { id: "pizza", image: "/icons/pizza_model.svg" },
  { id: "burgers", image: "/icons/burgernfries_model.svg" },
  { id: "desserts", image: "/icons/dessert_model.svg" },
  { id: "drinks", image: "/drink_sample.svg", subs: ["smoothie", "juice", "beverages"] },
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

export function FeaturedMeals() {
  const t = useTranslations("featured")
  const locale = useLocale()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("meals")
  const [activeSub, setActiveSub] = useState("beef")
  const activeCat = categories.find((c) => c.id === activeCategory)

  useEffect(() => {
    if (activeCat?.subs && activeCat.subs.length > 0) {
      setActiveSub(activeCat.subs[0])
    }
  }, [activeCategory])

  useEffect(() => {
    fetch("/api/recipe")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch recipes")
        return res.json() as Promise<Record<string, unknown>[]>
      })
      .then((data) => setMenuItems(data.map(mapRecipe)))
      .catch((e) => console.error("[FEATURED] Failed to fetch recipes:", e))
      .finally(() => setLoading(false))
  }, [])

  const activeValue = activeCat?.subs ? (subValues[activeSub] ?? activeCat.subs[0]) : catValues[activeCategory]
  const filtered = menuItems.filter((item) => item.category === activeValue)

  return (
    <section id="meals" className="relative h-screen overflow-hidden overflow-hidden bg-[#aa9a88]">
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/90 to-black/100" />

      <div className="relative z-10 mx-auto flex m-20 flex-col justify-center px-20 max-sm:px-4">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          custom={0}
          className="font-nunito text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50"
        >
          {t("eyebrow")}
        </motion.p>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          custom={1}
          className="font-playfair mt-4 text-4xl font-medium leading-tight text-white sm:text-5xl max-sm:text-3xl"
        >
          {t("title")}
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          custom={2}
          className="font-nunito mt-3 text-sm font-light text-white/55 max-sm:text-xs"
        >
          {t("disclaimer")}
        </motion.p>

        {/* Gallery */}
        <PremiumGallery key={activeValue} className=" h-[340px] md:h-[412px] mt-8 w-full max-sm:mt-6" itemScale={1}>
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <MealCard key={item.id} {...item} scale={1} name={translateContent(item.name, locale)} description={translateContent(item.description, locale)} />
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <p className="font-nunito text-sm text-white/50">{t("emptyState")}</p>
            </div>
          )}
        </PremiumGallery>

        {/* Category nav */}
        <div className="mt-10 flex flex-col items-center">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            className="font-nunito text-2xl font-medium leading-tight text-white max-sm:text-xl"
          >
            {t("navHeading")}
          </motion.p>

          <div className="mt-4 flex flex-wrap justify-center gap-3 max-sm:w-full max-sm:flex-nowrap max-sm:justify-start max-sm:overflow-x-auto max-sm:gap-2 max-sm:px-4 max-sm:snap-x max-sm:snap-mandatory max-sm:pb-2">
            {categories.map((cat) => (
              <motion.button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-sm transition-all max-sm:gap-1.5 max-sm:px-3 max-sm:py-1.5 max-sm:snap-center ${
                  activeCategory === cat.id
                    ? "border-white bg-white/10 text-white"
                    : "border-white/10 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <img src={cat.image} alt={t(`cats.${cat.id}`)} className="size-8 rounded-full object-cover max-sm:size-6" />
                <span className="font-nunito text-sm font-semibold max-sm:text-xs">{t(`cats.${cat.id}`)}</span>
              </motion.button>
            ))}
          </div>

          <div
            className={`grid w-full transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
              activeCat?.subs ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-wrap justify-center gap-2 max-sm:w-full max-sm:flex-nowrap max-sm:justify-start max-sm:overflow-x-auto max-sm:px-4 max-sm:snap-x max-sm:snap-mandatory max-sm:pb-2">
                {activeCat?.subs?.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setActiveSub(sub)}
                    className={`font-nunito shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors max-sm:snap-center ${
                      activeSub === sub
                        ? "border-white bg-white/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    {t(`subs.${sub}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}