"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ShoppingCart, Check, Flame, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { getCart, setCart } from "@/utils/cart"
import type { MealServingOption } from "@/constants"

const MotionImage = motion(Image)

export type { MealServingOption }

interface FeaturedMealProps {
  name: string
  image: string
  description: string
  price?: number
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
  servings?: MealServingOption[]
  scale?: number
  width?: string
  className?: string
}

export function MealCard({
  name,
  image,
  description,
  price,
  calories,
  protein = 0,
  carbs = 0,
  fats = 0,
  servings,
  scale = 1,
  width = "w-72 max-sm:w-48",
  className = "",
}: FeaturedMealProps) {
  const t = useTranslations("meals")
  const shortDesc = description.length > 70 ? description.slice(0, 70) + "..." : description
  const [imageHovered, setImageHovered] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [added, setAdded] = useState(false)
  const [servingIndex, setServingIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const activeServing = servings && servings.length > 0 ? servings[Math.min(servingIndex, servings.length - 1)] : null
  const displayPrice = activeServing?.price ?? price ?? 0
  const displayCalories = activeServing?.calories ?? calories ?? 0
  const displayProtein = activeServing?.nutrition?.protein_g ?? protein
  const displayCarbs = activeServing?.nutrition?.carbs_g ?? carbs
  const displayFats = activeServing?.nutrition?.fats_g ?? fats

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
    const key = activeServing ? `${name} (${activeServing.name ?? t("servingFallback", { index: servingIndex + 1 })})` : name
    const existing = cart.find((item) => item.name === key)
    if (existing) {
      existing.qty += 1
    } else {
      cart.push({ name: key, price: displayPrice, qty: 1, image })
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
          </div>
          <p className="font-nunito shrink-0 text-base font-bold text-white/90">{displayPrice} AED</p>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="font-nunito flex items-center gap-1 text-xs text-white/50">
            <Flame size={12} className="text-orange-400" /> {displayCalories} Cal
          </p>
          {servings && servings.length > 1 && (
            <div className="relative">
              <select
                value={servingIndex}
                onChange={(e) => setServingIndex(Number(e.target.value))}
                aria-label={t("servingAria")}
                className="font-nunito w-20 cursor-pointer appearance-none rounded-full border border-white/15 bg-white/10 pb-1 pe-5 ps-2.5 pt-1 text-[11px] font-medium text-white/80 outline-none transition-colors hover:bg-white/15 focus:border-white/40"
              >
                {servings.map((s, i) => (
                  <option key={s.id} value={i}>{s.name ?? t("servingFallback", { index: i + 1 })}</option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-white/50"
              />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-protein" />
            {displayProtein.toFixed(1)}g
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-carbs" />
            {displayCarbs.toFixed(1)}g
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-macro-fat" />
            {displayFats.toFixed(1)}g
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
                {t("added")}
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                {t("add")}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}