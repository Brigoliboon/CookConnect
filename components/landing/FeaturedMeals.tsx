"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PremiumGallery } from "@/components/landing/PremiumGallery"
import { MealCard } from "@/components/landing/MealCard"
import { DrinkCard } from "@/components/landing/DrinkCard"

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

const drinks = [
  { name: "Fresh Orange Juice", price: 18, image: "/menus/beef-steak.png", calories: 110, protein: 2, carbs: 26, fats: 0, description: "Freshly squeezed oranges, no added sugar." },
  { name: "Iced Matcha Latte", price: 22, image: "/menus/salad.png", calories: 140, protein: 4, carbs: 18, fats: 6, description: "Ceremonial matcha whisked with oat milk over ice." },
  { name: "Berry Smoothie", price: 24, image: "/menus/salmon-salad.png", calories: 190, protein: 6, carbs: 34, fats: 4, description: "Mixed berries, banana, Greek yogurt, and honey blended smooth." },
  { name: "Mango Lassi", price: 20, image: "/menus/shrimp-salad.png", calories: 200, protein: 5, carbs: 30, fats: 8, description: "Creamy yogurt blended with ripe alphonso mangoes." },
  { name: "Cold Brew Coffee", price: 18, image: "/menus/beef-steak.png", calories: 15, protein: 1, carbs: 3, fats: 0, description: "Slow-steeped 24-hour cold brew, served black." },
  { name: "Sparkling Lemonade", price: 16, image: "/menus/salad.png", calories: 80, protein: 0, carbs: 20, fats: 0, description: "Fresh lemon juice, sparkling water, and a touch of agave." },
  { name: "Watermelon Mint Cooler", price: 20, image: "/menus/salmon-salad.png", calories: 70, protein: 1, carbs: 17, fats: 0, description: "Pressed watermelon juice muddled with fresh mint." },
  { name: "Turmeric Golden Latte", price: 22, image: "/menus/shrimp-salad.png", calories: 160, protein: 3, carbs: 22, fats: 7, description: "Turmeric, ginger, cinnamon, and coconut milk latte." },
]

const categories = [
  { id: "meals", label: "Meals", image: "/menus/beef-steak.png", subs: ["Beef", "Chicken", "Seafood", "Soup", "Breakfast"] },
  { id: "salad", label: "Salad", image: "/menus/salad.png" },
  { id: "pasta", label: "Pasta", image: "/menus/salad.png" },
  { id: "wraps", label: "Wraps", image: "/menus/salmon-salad.png" },
  { id: "pizza", label: "Pizza", image: "/menus/shrimp-salad.png" },
  { id: "burgers", label: "Burgers 'n Fries", image: "/menus/beef-steak.png" },
  { id: "drinks", label: "Drinks", image: "/drink_sample.svg" },
]

export function FeaturedMeals() {
  const [activeCategory, setActiveCategory] = useState("meals")
  const [activeSub, setActiveSub] = useState("Beef")
  const activeCat = categories.find((c) => c.id === activeCategory)

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

        {/* Gallery */}
        <PremiumGallery className=" h-[340px] md:h-[412px] mt-8 w-full max-sm:mt-6" itemScale={1}>
          {featured.map((item) => (
            <MealCard key={item.name} {...item} scale={1} />
          ))}
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

        {/* <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          custom={1}
          className="font-playfair mt-4 text-4xl font-medium leading-tight text-white sm:text-5xl max-sm:text-3xl"
        >
          Drinks
        </motion.h2>

        <PremiumGallery className="h-[340px] md:h-[412px] mt-8 w-full max-sm:mt-6" itemScale={0.9}>
          {drinks.map((item) => (
            <DrinkCard key={item.name} {...item} image="/drink_sample.svg" />
          ))}
        </PremiumGallery> */}
      </div>
    </section>
  )
}
