"use client"

import { useState } from "react"
import Image from "next/image"
import { Check, ChevronDown, Flame, Minus, Plus, Trash2 } from "lucide-react"
import { imageVariant } from "@/lib/images"
import { fallbackImages } from "./catalog"
import type { PosItem } from "./types"

export function PosMealCard({
  item,
  qtyInCart,
  onAdd,
  onInc,
  onDec,
}: {
  item: PosItem
  qtyInCart: number
  onAdd: (servingIdx: number) => void
  onInc: () => void
  onDec: () => void
}) {
  const [servingIdx, setServingIdx] = useState(0)
  const [servingOpen, setServingOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const active = item.servings.length > 0 ? item.servings[Math.min(servingIdx, item.servings.length - 1)] : null
  const displayPrice = active?.price ?? item.price
  const displayCalories = active?.calories ?? item.calories

  function handleAdd() {
    onAdd(servingIdx)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <li
      role="button"
      tabIndex={0}
      aria-label={`Add ${item.name} to order`}
      onClick={handleAdd}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleAdd()
        }
      }}
      className="group flex cursor-pointer select-none flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 active:scale-[0.99]"
    >
      <div className="relative">
        <Image
          src={imageVariant(item.image || fallbackImages[item.category] || "/drink_sample.svg", 600)}
          alt={item.name}
          width={600}
          height={600}
          unoptimized
          loading="lazy"
          className="aspect-square w-full object-cover"
        />

        {/* Hover affordance — makes the whole card read as tappable */}
        {!added && (
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/10 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 lg:flex">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-lg">
              <Plus size={18} />
            </span>
          </div>
        )}

        {added && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-600/20 backdrop-blur-[1px]">
            <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              <Check size={14} /> Added
            </span>
          </div>
        )}

        {item.category && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            {item.category}
          </span>
        )}
        {qtyInCart > 0 && (
          <span className="absolute right-2 top-2 flex min-w-7 items-center justify-center rounded-full bg-brand-900 px-2 py-0.5 text-xs font-bold text-white shadow-md">
            ×{qtyInCart}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-sm font-semibold text-neutral-900" title={item.name}>
          {item.name}
        </p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-neutral-500">
            <Flame size={12} className="text-orange-400" />
            {displayCalories} Cal
          </span>
          <span className="text-sm font-bold text-brand-900">AED {Number(displayPrice).toFixed(2)}</span>
        </div>

        {item.servings.length > 1 && (
          <div
            className="relative mt-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setServingOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-medium text-neutral-700 transition-colors hover:border-neutral-300"
            >
              <span className="truncate">{active?.name ?? `Serving ${servingIdx + 1}`}</span>
              <ChevronDown size={12} className={`shrink-0 transition-transform ${servingOpen ? "rotate-180" : ""}`} />
            </button>
            {servingOpen && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                {item.servings.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setServingIdx(i); setServingOpen(false) }}
                    className={`flex w-full items-center justify-between px-2 py-1.5 text-[11px] transition-colors hover:bg-neutral-50 ${
                      i === servingIdx ? "bg-neutral-50 font-semibold text-brand-900" : "text-neutral-600"
                    }`}
                  >
                    <span className="truncate">{s.name ?? `Serving ${i + 1}`}</span>
                    {s.price != null && <span className="ml-2 shrink-0 font-semibold">{Number(s.price).toFixed(2)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
          {qtyInCart === 0 ? (
            <span className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-500 transition-colors group-hover:bg-neutral-900 group-hover:text-white">
              <Plus size={14} /> Tap to add
            </span>
          ) : (
            <div
              className="flex w-full items-center justify-between gap-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={onDec}
                aria-label="Decrease quantity"
                className="flex size-8 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-100 active:scale-95"
              >
                {qtyInCart === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
              </button>
              <span className="text-sm font-bold text-neutral-900">{qtyInCart}</span>
              <button
                onClick={onInc}
                aria-label="Increase quantity"
                className="flex size-8 items-center justify-center rounded-xl bg-neutral-900 text-white transition-colors hover:bg-neutral-700 active:scale-95"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
