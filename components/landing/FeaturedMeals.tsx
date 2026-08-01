"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { MealCard } from "@/components/landing/MealCard"

function getItemsPerPage(width: number) {
  if (width < 640) return 1
  if (width < 1024) return 2
  return 5
}

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

const featured = [
  { name: "Beef Steak", price: 48, image: "/menus/beef-steak.png", calories: 420, protein: 30, carbs: 25, fats: 22, description: "Thinly sliced ribeye stir-fried with bell peppers, broccoli, and snap peas in a savory garlic-soy glaze." },
  { name: "Garden Salad", price: 26, image: "/menus/salad.png", calories: 280, protein: 8, carbs: 12, fats: 22, description: "Fresh tomatoes, cucumbers, red onions, Kalamata olives, and bell peppers tossed with oregano vinaigrette." },
  { name: "Salmon Salad", price: 42, image: "/menus/salmon-salad.png", calories: 420, protein: 40, carbs: 8, fats: 26, description: "Fresh Atlantic salmon fillet grilled to perfection, drizzled with a creamy lemon dill sauce." },
  { name: "Shrimp Salad", price: 38, image: "/menus/shrimp-salad.png", calories: 310, protein: 28, carbs: 6, fats: 20, description: "Plump shrimp sautéed in a luscious garlic butter sauce with white wine, lemon juice, and fresh parsley." },
  { name: "Grilled Chicken", price: 36, image: "/menus/beef-steak.png", calories: 380, protein: 42, carbs: 18, fats: 14, description: "Herb-marinated chicken breast grilled over open flame, served with roasted garlic mash and seasonal greens." },
  { name: "Pasta Carbonara", price: 34, image: "/menus/salad.png", calories: 520, protein: 22, carbs: 48, fats: 28, description: "Classic Roman pasta with crispy pancetta, egg yolk, pecorino romano, and freshly cracked black pepper." },
  { name: "Margherita Pizza", price: 30, image: "/menus/salmon-salad.png", calories: 460, protein: 18, carbs: 52, fats: 20, description: "Wood-fired Neapolitan pizza with San Marzano tomatoes, fresh mozzarella, and hand-torn basil." },
  { name: "Sushi Platter", price: 56, image: "/menus/shrimp-salad.png", calories: 340, protein: 32, carbs: 38, fats: 10, description: "Chef's selection of nigiri and maki rolls with premium tuna, salmon, and yellowtail." },
  { name: "Lamb Chops", price: 52, image: "/menus/beef-steak.png", calories: 480, protein: 36, carbs: 12, fats: 32, description: "New Zealand lamb chops crusted with rosemary and thyme, served with minted yogurt reduction." },
  { name: "Caesar Salad", price: 28, image: "/menus/salad.png", calories: 320, protein: 14, carbs: 16, fats: 24, description: "Crisp romaine hearts, house-made croutons, shaved parmesan, and classic Caesar dressing." },
  { name: "Grilled Salmon", price: 46, image: "/menus/salmon-salad.png", calories: 400, protein: 38, carbs: 10, fats: 24, description: "Wild-caught salmon fillet with a honey-soy glaze, served on a bed of jasmine rice." },
  { name: "Mushroom Risotto", price: 32, image: "/menus/shrimp-salad.png", calories: 440, protein: 12, carbs: 56, fats: 18, description: "Creamy Arborio rice with wild mushrooms, white wine, and a finish of truffle oil and parmesan." },
]

export function FeaturedMeals() {
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  useEffect(() => {
    const update = () => setItemsPerPage(getItemsPerPage(window.innerWidth))
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    setPage(0)
  }, [itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(featured.length / itemsPerPage))
  const start = page * itemsPerPage
  const visible = featured.slice(start, start + itemsPerPage)

  return (
    <section className="relative  overflow-hidden overflow-hidden bg-[#aa9a88]">
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

        <div className="relative h-[412px] mt-16 w-full max-sm:mt-12">
          {totalPages > 1 && (
            <div className="max-sm:hidden">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="absolute -left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white disabled:opacity-30 max-sm:-left-2 max-sm:size-8"
              >
                <ChevronLeft size={18} className="text-neutral-800 max-sm:size-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="absolute -right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white disabled:opacity-30 max-sm:-right-2 max-sm:size-8"
              >
                <ChevronRight size={18} className="text-neutral-800 max-sm:size-4" />
              </button>
            </div>
          )}

          <div className="flex items-stretch gap-8 overflow-hidden pb-2 max-sm:justify-start max-sm:overflow-x-auto max-sm:gap-5 max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-smooth max-sm:px-4">
            <AnimatePresence mode="wait">
              {(itemsPerPage < 2 ? featured : visible).map((item) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="shrink-0 max-sm:snap-center"
                >
                  <MealCard {...item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
