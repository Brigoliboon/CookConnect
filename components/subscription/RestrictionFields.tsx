"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { MENU_CATEGORIES } from "@/constants"
import {
  RESTRICTABLE_MEAL_CATEGORIES,
  categoryRestrictionLabel,
  type IngredientRef,
} from "@/lib/subscription/restrictions"

type Variant = "brand" | "staff"

const CATEGORY_OPTIONS = MENU_CATEGORIES.filter((c) =>
  (RESTRICTABLE_MEAL_CATEGORIES as readonly string[]).includes(c.value),
)

export function RestrictionFields({
  restricted,
  onRestrictedChange,
  restrictedCategories,
  onCategoriesChange,
  variant = "brand",
}: {
  restricted: IngredientRef[]
  onRestrictedChange: (next: IngredientRef[]) => void
  restrictedCategories: string[]
  onCategoriesChange: (next: string[]) => void
  variant?: Variant
}) {
  const [ingSearch, setIngSearch] = useState("")
  const [ingredients, setIngredients] = useState<IngredientRef[]>([])
  const [ingsExpanded, setIngsExpanded] = useState(false)
  const brand = variant === "brand"

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/ingredients?search=${encodeURIComponent(ingSearch)}&limit=30`)
        .then((r) => r.json())
        .then((d) => {
          const list = (d.data ?? []) as IngredientRef[]
          setIngredients(list)
        })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [ingSearch])

  function toggleIngredient(id: string, name: string) {
    onRestrictedChange(
      restricted.some((item) => item.id === id)
        ? restricted.filter((item) => item.id !== id)
        : [...restricted, { id, name }],
    )
  }

  function toggleCategory(category: string) {
    onCategoriesChange(
      restrictedCategories.includes(category)
        ? restrictedCategories.filter((item) => item !== category)
        : [...restrictedCategories, category],
    )
  }

  const searchClass = brand
    ? "w-full rounded-xl border border-brand-700/40 bg-brand-700/20 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-900 focus:bg-white"
    : "w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
  const searchIconClass = brand ? "text-brand-900" : "text-neutral-400"
  const idleChip = brand
    ? "border-brand-700/40 text-neutral-600 hover:border-brand-400 hover:bg-brand-700/20"
    : "border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-100"
  const activeChip = "border-red-400 bg-red-50 text-red-600"
  const expandClass = brand
    ? "flex items-center justify-center rounded-full border border-brand-700/40 px-2.5 py-1.5 text-brand-900 transition-all hover:border-brand-400 hover:bg-brand-700/20"
    : "flex items-center justify-center rounded-full border border-neutral-200 px-2.5 py-1.5 text-neutral-600 transition-all hover:bg-neutral-100"

  return (
    <div>
      <h3 className={brand ? "text-sm font-bold text-neutral-900" : "text-xs font-semibold text-neutral-500"}>
        Restrictions
      </h3>
      <p className={brand ? "mt-0.5 text-xs text-neutral-400" : "mt-0.5 text-xs text-neutral-400"}>
        Optional — skip a meal type, or search ingredients you cannot eat.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((category) => {
          const active = restrictedCategories.includes(category.value)
          return (
            <button
              type="button"
              key={category.value}
              onClick={() => toggleCategory(category.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${active ? activeChip : idleChip}`}
            >
              {categoryRestrictionLabel(category.value)}
            </button>
          )
        })}
      </div>

      <div className="relative mt-3">
        <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${searchIconClass}`} />
        <input
          value={ingSearch}
          onChange={(e) => setIngSearch(e.target.value)}
          placeholder="Search ingredients..."
          className={searchClass}
        />
      </div>

      {(restricted.length > 0 || restrictedCategories.length > 0) && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {restrictedCategories.map((category) => (
            <span
              key={`cat:${category}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-400 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
            >
              {categoryRestrictionLabel(category)}
              <button type="button" onClick={() => toggleCategory(category)} aria-label="Remove restriction">
                <X size={12} />
              </button>
            </span>
          ))}
          {restricted.map((item) => (
            <span
              key={item.id}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-400 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
            >
              {item.name}
              <button
                type="button"
                onClick={() => onRestrictedChange(restricted.filter((entry) => entry.id !== item.id))}
                aria-label="Remove restriction"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {ingredients.slice(0, 8).map((ing) => (
          <button
            type="button"
            key={ing.id}
            onClick={() => toggleIngredient(ing.id, ing.name)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${restricted.some((item) => item.id === ing.id) ? activeChip : idleChip}`}
          >
            {ing.name}
          </button>
        ))}
        {ingredients.length > 8 && (
          <button
            type="button"
            onClick={() => setIngsExpanded((v) => !v)}
            aria-label={ingsExpanded ? "Collapse ingredients" : "Expand ingredients"}
            className={expandClass}
          >
            <ChevronDown size={14} className={`transition-transform duration-300 ${ingsExpanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      <div
        className={`grid transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${ingsExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2 pt-1">
            {ingredients.slice(8).map((ing) => (
              <button
                type="button"
                key={ing.id}
                onClick={() => toggleIngredient(ing.id, ing.name)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${restricted.some((item) => item.id === ing.id) ? activeChip : idleChip}`}
              >
                {ing.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
