"use client"

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
  const imageUrl = `https://picsum.photos/seed/${item.id}/600/400`

  return (
    <motion.div
      variants={cardVariants}
      className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl bg-cover bg-center"
      style={{ backgroundImage: `url(${imageUrl})` }}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <h3 className="text-lg font-semibold leading-tight text-white">{item.name}</h3>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/75">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-macro-protein" />
            P {item.protein}g
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-macro-carbs" />
            C {item.carbs}g
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-macro-fat" />
            F {item.fats}g
          </span>
          <span className="text-lg font-extrabold text-white">
            {item.calories}
            <span className="ml-0.5 text-xs font-semibold text-white/60">Cal</span>
          </span>
        </div>
      </div>
    </motion.div>
  )
}
