"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ShoppingCart, Flame } from "lucide-react"

interface FeaturedMealProps {
  name: string
  price: number
  image: string
  calories: number
  protein: number
  carbs: number
  fats: number
  description: string
}

export function MealCard({ name, price, image, calories, protein, carbs, fats, description }: FeaturedMealProps) {
  const shortDesc = description.length > 70 ? description.slice(0, 70) + "..." : description
  const [imageHovered, setImageHovered] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setRevealed(true), 1250)
          observer.disconnect()
        }
      },
      { rootMargin: "-50px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const shrunk = revealed && !imageHovered

  return (
    <div ref={ref} className="relative shrink-0 w-72">
      <div className="relative z-10 flex justify-center">
        <motion.div
          animate={{ width: shrunk ? "70%" : "100%" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden rounded-2xl"
          onMouseEnter={() => setImageHovered(true)}
          onMouseLeave={() => setImageHovered(false)}
        >
          <motion.img
            src={image}
            alt={name}
            className="w-full"
            animate={{ scale: shrunk ? 0.85 : 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </motion.div>
      </div>

      <motion.div
        animate={{ y: shrunk ? 0 : 20, opacity: shrunk ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="group/detail -mt-16 rounded-2xl border border-white/10 bg-white/10 px-5 pb-5 pt-20 backdrop-blur-sm opacity-0"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-nunito text-base font-semibold text-white/90">{name}</p>
            <p className="font-nunito mt-1 flex items-center gap-1 text-xs text-white/50"><Flame size={12} className="text-orange-400" /> {calories} Cal</p>
          </div>
          <p className="font-nunito shrink-0 text-base font-bold text-white/90">{price} AED</p>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-protein" />
            {protein}g
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-carbs" />
            {carbs}g
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-fat" />
            {fats}g
          </span>
        </div>

        <p className="font-nunito mt-2 text-xs leading-relaxed text-white/70 line-clamp-2">{shortDesc}</p>

        <div className="mt-3 opacity-0 transition-all duration-200 group-hover/detail:opacity-100">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-2 text-xs font-semibold text-white transition-all hover:bg-white/10">
            <ShoppingCart size={14} />
            Add to Order
          </button>
        </div>
      </motion.div>
    </div>
  )
}
