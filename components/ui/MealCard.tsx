"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { MenuItem } from "@/constants"

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
}

interface MealCardProps {
  item: MenuItem
  onClick?: () => void
}

export function MealCard({ item, onClick }: MealCardProps) {
  const imageUrl = item.image_path ?? undefined
  const [servingIndex, setServingIndex] = useState(0)
  const servings = item.servings ?? []
  const activeServing = servings.length > 0 ? servings[Math.min(servingIndex, servings.length - 1)] : null

  const calories = activeServing?.calories ?? item.calories
  const protein = activeServing?.nutrition?.protein_g ?? item.protein
  const carbs = activeServing?.nutrition?.carbs_g ?? item.carbs
  const fats = activeServing?.nutrition?.fats_g ?? item.fats
  const price = activeServing?.price ?? item.price

  return (
    <motion.div
      variants={cardVariants}
      className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl bg-cover bg-center"
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 p-4">
        <div className="flex items-end justify-between gap-2">
          <h3 className="min-w-0 text-lg font-semibold leading-tight text-white">{item.name}</h3>
          <span className="shrink-0 text-base font-extrabold text-white">
            {price}
            <span className="ml-0.5 text-xs font-semibold text-white/60">DH</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/75">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-macro-protein" />
            P {protein}g
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-macro-carbs" />
            C {carbs}g
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-macro-fat" />
            F {fats}g
          </span>
          <span className="text-lg font-extrabold text-white">
            {calories}
            <span className="ml-0.5 text-xs font-semibold text-white/60">Cal</span>
          </span>
        </div>
        {servings.length > 1 && (
          <div className="mt-1 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
            {servings.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setServingIndex(i)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  i === servingIndex
                    ? "border-white bg-white/25 text-white"
                    : "border-white/20 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {s.name ?? `Serving ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}