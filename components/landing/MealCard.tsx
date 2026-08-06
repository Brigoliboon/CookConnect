"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ShoppingCart, Check, Flame } from "lucide-react"
import { getCart, setCart } from "@/utils/cart"

const MotionImage = motion(Image)

interface FeaturedMealProps {
  name: string
  price: number
  image: string
  calories: number
  protein: number
  carbs: number
  fats: number
  description: string
  scale?: number
  width?: string
  className?: string
}

export function MealCard({ name, price, image, calories, protein, carbs, fats, description, scale = 1, width = "w-72 max-sm:w-48", className = "" }: FeaturedMealProps) {
  const shortDesc = description.length > 70 ? description.slice(0, 70) + "..." : description
  const [imageHovered, setImageHovered] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [added, setAdded] = useState(false)
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

  function handleAdd() {
    const cart = getCart()
    const existing = cart.find((item) => item.name === name)
    if (existing) {
      existing.qty += 1
    } else {
      cart.push({ name, price, qty: 1, image })
    }
    setCart(cart)
    window.dispatchEvent(new Event("cart-changed"))
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div ref={ref} style={{ scale }} className={`relative shrink-0 h-full max-sm:snap-start ${width} ${className}`}>
      <div className="relative z-10 flex justify-center">
        <motion.div
          animate={{ width: shrunk ? "70%" : "100%" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative aspect-square overflow-hidden rounded-2xl"
          onMouseEnter={() => setImageHovered(true)}
          onMouseLeave={() => setImageHovered(false)}
        >
          <MotionImage
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 192px, 288px"
            className="object-cover"
            animate={{ scale: shrunk ? 0.85 : 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </motion.div>
      </div>

      <motion.div
        animate={{ y: shrunk ? 0 : 20, opacity: shrunk ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="group/detail -mt-16 rounded-2xl border border-white/10 bg-white/10 px-5 pb-5 pt-15 backdrop-blur-sm opacity-0"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-nunito truncate text-base font-semibold text-white/90" title={name}>{name}</p>
            <p className="font-nunito mt-1 flex items-center gap-1 text-xs text-white/50"><Flame size={12} className="text-orange-400" /> {calories} Cal</p>
          </div>
          <p className="font-nunito shrink-0 text-base font-bold text-white/90">{price} AED</p>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-protein" />
            {protein.toFixed(1)}g
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-carbs" />
            {carbs.toFixed(1)}g
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-fat" />
            {fats.toFixed(1)}g
          </span>
        </div>

        <p className="font-nunito h-[39] mt-2 text-xs leading-relaxed text-white/70 line-clamp-2">{shortDesc}</p>

        <div className="mt-3 opacity-0 transition-all duration-200 group-hover/detail:opacity-100 max-sm:opacity-100">
          <button
            onClick={handleAdd}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-all ${
              added
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-white/20 text-white hover:bg-white/10"
            }`}
          >
            {added ? (
              <>
                <Check size={14} />
                Added to Order
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                Add to Order
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
