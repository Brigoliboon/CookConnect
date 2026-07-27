"use client"

import { useState } from "react"
import { MealCard } from "./MealCard"
import { MealDetailDialog } from "./MealDetailDialog"
import type { MenuItem } from "@/constants"

const CAT_BG: Record<string, string> = {
  chicken: "https://picsum.photos/seed/chicken-dish/200/80",
  beef: "https://picsum.photos/seed/beef-dish/200/80",
  seafood: "https://picsum.photos/seed/seafood-platter/200/80",
  salad: "https://picsum.photos/seed/fresh-salad/200/80",
  wrap: "https://picsum.photos/seed/gourmet-wrap/200/80",
  breakfast: "https://picsum.photos/seed/hearty-breakfast/200/80",
  pasta: "https://picsum.photos/seed/pasta-dish/200/80",
  soup: "https://picsum.photos/seed/warm-soup/200/80",
}

interface MealGalleryProps {
  items: MenuItem[]
  categories: { label: string; value: string }[]
}

export function MealGallery({ items, categories }: MealGalleryProps) {
  const [activeCat, setActiveCat] = useState(categories[0]?.value ?? "")
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null)

  const filtered = items.filter((item) => item.category === activeCat)

  return (
    <div>
      <nav className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {categories.map((cat) => {
          const isActive = activeCat === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCat(cat.value)}
              className={`relative cursor-pointer overflow-hidden rounded-lg px-2 py-4 text-sm font-medium transition-all ${
                isActive
                  ? "text-white hover:brightness-110"
                  : "bg-white text-text-secondary ring-1 ring-border-light hover:ring-brand-900 hover:text-brand-900"
              }`}
            >
              {isActive && (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${CAT_BG[cat.value] ?? CAT_BG.chicken})` }}
                />
              )}
              {isActive && <div className="absolute inset-0 bg-black/50" />}
              <span className="relative z-10">{cat.label}</span>
            </button>
          )
        })}
      </nav>

      {filtered.length > 0 ? (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {filtered.map((item) => (
              <div key={item.id} className="w-64 shrink-0">
                <MealCard item={item} onClick={() => setDetailItem(item)} />
              </div>
            ))}
          </div>
          <MealDetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
        </>
      ) : (
        <p className="py-8 text-center text-sm text-text-secondary">No items in this category.</p>
      )}
    </div>
  )
}
