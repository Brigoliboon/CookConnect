"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
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
  { id: "meals", label: "Meals", image: "/menus/beef-steak.png", subs: ["Beef", "Chicken", "Seafood", "Soup", "Breakfast"] },
  { id: "salad", label: "Salad", image: "/menus/salad.png" },
  { id: "pasta", label: "Pasta", image: "/icons/pasta_model.svg" },
  { id: "wraps", label: "Wraps", image: "/icons/wraps_model.svg" },
  { id: "pizza", label: "Pizza", image: "/icons/pizza_model.svg" },
  { id: "burgers", label: "Burgers 'n Fries", image: "/icons/burgernfries_model.svg" },
  { id: "drinks", label: "Drinks", image: "/drink_sample.svg" },
]

const subValues: Record<string, string> = {
  Beef: "beef",
  Chicken: "chicken",
  Seafood: "seafood",
  Soup: "soup",
  Breakfast: "breakfast",
}

const catValues: Record<string, string> = {
  salad: "salad",
  pasta: "pasta",
  wraps: "wrap",
  pizza: "pizza",
  burgers: "burgers",
  drinks: "drinks",
}

export function FeaturedMeals() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("meals")
  const [activeSub, setActiveSub] = useState("Beef")
  const activeCat = categories.find((c) => c.id === activeCategory)

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

  const activeValue = activeCategory === "meals" ? (subValues[activeSub] ?? "beef") : catValues[activeCategory]
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
          Chef&apos;s Selection
        </motion.p>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          custom={1}
          className="font-playfair mt-4 text-4xl font-medium leading-tight text-white sm:text-5xl max-sm:text-3xl"
        >
          Curated Plates
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          custom={2}
          className="font-nunito mt-3 text-sm font-light text-white/55 max-sm:text-xs"
        >
          The image shown is for presentation only — the actual dish may vary from what is displayed.
        </motion.p>

        {/* Gallery */}
        <PremiumGallery className=" h-[340px] md:h-[412px] mt-8 w-full max-sm:mt-6" itemScale={1}>
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <MealCard key={item.name} {...item} scale={1} />
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <p className="font-nunito text-sm text-white/50">Nothing here yet — coming soon.</p>
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
            Want something else?
          </motion.p>

          <div className="mt-4 flex flex-wrap justify-center gap-3 max-sm:gap-2">
            {categories.map((cat) => (
              <motion.button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-sm transition-all max-sm:gap-1.5 max-sm:px-3 max-sm:py-1.5 ${
                  activeCategory === cat.id
                    ? "border-white bg-white/10 text-white"
                    : "border-white/10 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <img src={cat.image} alt={cat.label} className="size-8 rounded-full object-cover max-sm:size-6" />
                <span className="font-nunito text-sm font-semibold max-sm:text-xs">{cat.label}</span>
              </motion.button>
            ))}
          </div>

          <div
            className={`grid w-full transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
              activeCat?.subs ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-wrap justify-center gap-2">
                {activeCat?.subs?.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setActiveSub(sub)}
                    className={`font-nunito rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors ${
                      activeSub === sub
                        ? "border-white bg-white/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    {sub}
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
