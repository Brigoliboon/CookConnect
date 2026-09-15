"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"

interface SideOption {
  id: string
  meal_recipe_id: string
  addon_recipe_id: string
  extra_cents: number
  is_default: boolean
  addon_name: string
  addon_image_path: string | null
}

export function CartSidePicker({
  mealRecipeId,
  selectedId,
  onSelect,
}: {
  mealRecipeId: string
  selectedId?: string | null
  onSelect: (opt: SideOption | null) => void
}) {
  const [options, setOptions] = useState<SideOption[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(!selectedId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/recipe-addons?meal_id=${mealRecipeId}`)
      .then(async (res) => {
        if (!res.ok) return { data: [] }
        return res.json()
      })
      .then(({ data }) => {
        if (!cancelled) setOptions(data ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mealRecipeId])

  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 w-24 shrink-0 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    )
  }

  if (options.length === 0) return null

  const selected = options.find((o) => o.addon_recipe_id === selectedId) ?? options.find((o) => o.is_default) ?? options[0]

  if (!expanded && selected) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-left transition-colors hover:border-neutral-300"
      >
        {selected.addon_image_path && (
          <img src={selected.addon_image_path} alt={selected.addon_name} className="h-8 w-10 shrink-0 rounded-lg object-cover" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-neutral-900">{selected.addon_name}</span>
          <span className="block text-[10px] text-neutral-500">
            {selected.extra_cents === 0 ? "Free" : `+${(selected.extra_cents / 100).toFixed(2)} AED`} · Change
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((opt) => {
        const active = selectedId === opt.addon_recipe_id || (!selectedId && opt.is_default)
        return (
          <button
            key={opt.id}
            onClick={() => {
              onSelect(opt)
              setExpanded(false)
            }}
            className={`relative aspect-[4/3] w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-cover bg-center text-left transition-all ${
              active ? "ring-2 ring-brand-900" : "opacity-80 hover:opacity-100"
            }`}
            style={opt.addon_image_path ? { backgroundImage: `url(${opt.addon_image_path})` } : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            {active && (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand-900 text-white">
                <Check size={10} />
              </span>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-1.5">
              <p className="truncate text-[10px] font-semibold leading-tight text-white">{opt.addon_name}</p>
              <p className="text-[9px] font-bold text-white/70">
                {opt.extra_cents === 0 ? "Free" : `+${(opt.extra_cents / 100).toFixed(2)}`}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
