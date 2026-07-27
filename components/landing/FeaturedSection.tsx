"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { MealCard } from "@/components/landing/MealCard"

const ITEMS_PER_PAGE = 4

const meals = [
  { id: "CHK-01", name: "Grilled Lemon Herb Chicken", price: 32, calories: 380, protein: 42, carbs: 10, fats: 18, description: "Tender chicken breast marinated in fresh lemon juice, garlic, and Mediterranean herbs.", image: "https://picsum.photos/seed/CHK-01/400/280" },
  { id: "BEF-01", name: "Beef Stir Fry", price: 42, calories: 420, protein: 30, carbs: 25, fats: 22, description: "Thinly sliced ribeye stir-fried with bell peppers, broccoli, and snap peas.", image: "https://picsum.photos/seed/BEF-01/400/280" },
  { id: "SFD-01", name: "Grilled Salmon", price: 55, calories: 420, protein: 40, carbs: 8, fats: 26, description: "Fresh Atlantic salmon fillet grilled to perfection with lemon dill sauce.", image: "https://picsum.photos/seed/SFD-01/400/280" },
  { id: "SLD-03", name: "Mediterranean Quinoa Salad", price: 30, calories: 340, protein: 12, carbs: 38, fats: 16, description: "Fluffy quinoa with roasted zucchini, cherry tomatoes, and lemon-tahini dressing.", image: "https://picsum.photos/seed/SLD-03/400/280" },
  { id: "PST-01", name: "Spaghetti Bolognese", price: 38, calories: 480, protein: 24, carbs: 55, fats: 18, description: "Al dente spaghetti with slow-simmered Bolognese sauce of beef and tomatoes.", image: "https://picsum.photos/seed/PST-01/400/280" },
  { id: "CHK-07", name: "Chicken Tikka", price: 35, calories: 360, protein: 40, carbs: 12, fats: 18, description: "Boneless chicken marinated in spiced yogurt, charred and juicy.", image: "https://picsum.photos/seed/CHK-07/400/280" },
  { id: "SFD-08", name: "Lemon Butter Cod", price: 45, calories: 320, protein: 34, carbs: 6, fats: 18, description: "Cod pan-seared to golden crust in silky lemon butter sauce.", image: "https://picsum.photos/seed/SFD-08/400/280" },
  { id: "SLD-04", name: "Asian Sesame Salad", price: 28, calories: 290, protein: 10, carbs: 18, fats: 20, description: "Greens, carrots, edamame, and wonton strips in sesame ginger dressing.", image: "https://picsum.photos/seed/SLD-04/400/280" },
]

const drinks = [
  { id: "DRK-01", name: "Fresh Orange Juice", price: 18, calories: 110, protein: 2, carbs: 26, fats: 0, description: "Freshly squeezed oranges, no added sugar.", image: "https://picsum.photos/seed/DRK-01/400/280" },
  { id: "DRK-02", name: "Iced Matcha Latte", price: 22, calories: 140, protein: 4, carbs: 18, fats: 6, description: "Ceremonial matcha whisked with oat milk over ice.", image: "https://picsum.photos/seed/DRK-02/400/280" },
  { id: "DRK-03", name: "Berry Smoothie", price: 24, calories: 190, protein: 6, carbs: 34, fats: 4, description: "Mixed berries, banana, Greek yogurt, and honey blended smooth.", image: "https://picsum.photos/seed/DRK-03/400/280" },
  { id: "DRK-04", name: "Mango Lassi", price: 20, calories: 200, protein: 5, carbs: 30, fats: 8, description: "Creamy yogurt blended with ripe alphonso mangoes.", image: "https://picsum.photos/seed/DRK-04/400/280" },
  { id: "DRK-05", name: "Cold Brew Coffee", price: 18, calories: 15, protein: 1, carbs: 3, fats: 0, description: "Slow-steeped 24-hour cold brew, served black.", image: "https://picsum.photos/seed/DRK-05/400/280" },
  { id: "DRK-06", name: "Sparkling Lemonade", price: 16, calories: 80, protein: 0, carbs: 20, fats: 0, description: "Fresh lemon juice, sparkling water, and a touch of agave.", image: "https://picsum.photos/seed/DRK-06/400/280" },
  { id: "DRK-07", name: "Watermelon Mint Cooler", price: 20, calories: 70, protein: 1, carbs: 17, fats: 0, description: "Pressed watermelon juice muddled with fresh mint.", image: "https://picsum.photos/seed/DRK-07/400/280" },
  { id: "DRK-08", name: "Turmeric Golden Latte", price: 22, calories: 160, protein: 3, carbs: 22, fats: 7, description: "Turmeric, ginger, cinnamon, and coconut milk latte.", image: "https://picsum.photos/seed/DRK-08/400/280" },
]

const containerVar = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const itemVar = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
}

function CarouselRow({ title, items }: { title: string; items: typeof meals }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
  const start = page * ITEMS_PER_PAGE
  const visible = items.slice(start, start + ITEMS_PER_PAGE)
  const isFirst = page === 0
  const isLast = page >= totalPages - 1

  return (
    <motion.div variants={containerVar} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}>
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-playfair text-3xl font-medium text-white">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={isFirst}
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={isLast}
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-10">
        <AnimatePresence mode="wait">
          {visible.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <MealCard {...item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function FeaturedSection() {
  return (
    <section className="bg-[#9A8678] px-8 py-16">
      <div className="space-y-16">
        <CarouselRow title="From Our Kitchen" items={meals} />
        <CarouselRow title="Refreshments" items={drinks} />
      </div>
    </section>
  )
}
