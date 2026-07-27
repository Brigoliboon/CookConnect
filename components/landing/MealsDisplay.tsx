"use client"

import { motion } from "framer-motion"
import { getMenuByCategory } from "@/constants"

const categories = ["chicken", "beef", "seafood", "salad"] as const

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.1 },
  }),
}

const cardReveal = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
}

export function MealsDisplay() {
  return (
    <motion.section
      id="meals"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="bg-white px-6 py-32"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
            Our Selection
          </span>
          <h2 className="font-playfair mt-4 text-5xl font-medium leading-tight text-black sm:text-6xl lg:text-7xl">
            Curated for You
          </h2>
          <div className="mx-auto mt-6 h-px w-12 bg-black/20" />
          <p className="font-nunito mx-auto mt-6 max-w-md text-sm leading-relaxed text-black/50">
            Every dish is thoughtfully composed — from protein to plate.
          </p>
        </motion.div>

        <div className="mt-24 space-y-28">
          {categories.map((cat, ci) => {
            const items = getMenuByCategory(cat)
            return (
              <motion.div key={cat} variants={fadeUp} custom={ci + 1}>
                <div className="mb-10 flex items-center gap-4">
                  <h3 className="font-playfair text-3xl font-medium capitalize text-black">{cat}</h3>
                  <div className="flex-1 border-t border-neutral-200" />
                  <span className="font-nunito text-xs text-black/30">{items.length} items</span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {items.slice(0, 4).map((item, ii) => (
                    <motion.div
                      key={item.id}
                      variants={cardReveal}
                      custom={ii}
                      className="group cursor-pointer"
                    >
                      <div className="overflow-hidden rounded-2xl bg-neutral-50">
                        <div
                          className="h-44 bg-cover bg-center transition-all duration-700 group-hover:scale-105"
                          style={{ backgroundImage: `url(https://picsum.photos/seed/${item.id}/400/280)` }}
                        />
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-nunito text-sm font-semibold text-black">{item.name}</p>
                          <p className="font-nunito shrink-0 text-sm font-semibold text-black/60">{item.price} DH</p>
                        </div>
                        <p className="font-nunito text-xs leading-relaxed text-black/40 line-clamp-2">{item.description}</p>
                        <div className="flex gap-3 pt-1.5">
                          <span className="font-nunito text-[11px] text-black/30">{item.calories} cal</span>
                          <span className="font-nunito text-[11px] text-black/30">P {item.protein}g</span>
                          <span className="font-nunito text-[11px] text-black/30">C {item.carbs}g</span>
                          <span className="font-nunito text-[11px] text-black/30">F {item.fats}g</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}
