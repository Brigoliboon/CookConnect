"use client"

import { useState } from "react"
import { MealCard } from "./MealCard"
import { MealDetailDialog } from "./MealDetailDialog"
import type { MenuItem } from "@/constants"

interface MealGalleryProps {
  items: MenuItem[]
  categories: { label: string; value: string }[]
  onEdit?: (item: MenuItem) => void
}

export function MealGallery({ items, categories, onEdit }: MealGalleryProps) {
  const [activeCat, setActiveCat] = useState(categories[0]?.value ?? "")
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null)

  const filtered = items.filter((item) => item.category === activeCat)

  return (
    <div>
      <nav className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const isActive = activeCat === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCat(cat.value)}
              className={`shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-brand-900 text-white"
                  : "bg-white text-text-secondary ring-1 ring-border-light hover:ring-brand-900 hover:text-brand-900"
              }`}
            >
              {cat.label}
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
          <MealDetailDialog item={detailItem} onClose={() => setDetailItem(null)} onEdit={onEdit} />
        </>
      ) : (
        <p className="py-8 text-center text-sm text-text-secondary">No items in this category.</p>
      )}
    </div>
  )
}
