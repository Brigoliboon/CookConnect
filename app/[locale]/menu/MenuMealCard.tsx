"use client"

import { useState } from "react"
import { Flame, Beef, Wheat, ChevronDown, ShoppingCart, Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { imageSrcSet, imageVariant } from "@/lib/images"
import { DirhamSign } from "@/components/ui/DirhamSign"
import { addCartItem } from "@/utils/cart"
import type { MenuItem } from "./MenuClient"

export type MenuCardVariant = "list" | "compact"

/** Meal awaiting a side selection in the mobile addon sheet. */
export interface AddonTargetState {
  recipeId: string
  /** Serving-aware cart name, e.g. "Chicken Bowl (Large)". */
  name: string
  price: number
  image: string
}

const LIST_GRID = "flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-3"
const COMPACT_GRID = "flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4"

export function menuCardGridClass(variant: MenuCardVariant) {
  return variant === "compact" ? COMPACT_GRID : LIST_GRID
}

export function MenuCardsSkeleton({ variant = "list" }: { variant?: MenuCardVariant }) {
  const compact = variant === "compact"
  return (
    <div className={menuCardGridClass(variant)} aria-hidden="true">
      {Array.from({ length: compact ? 8 : 6 }).map((_, index) => (
        <div
          key={index}
          className={`flex overflow-hidden rounded-2xl border border-neutral-100 bg-white ${
            compact ? "md:flex-col" : ""
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3 sm:p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
            <div className="h-2.5 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-2.5 w-4/5 animate-pulse rounded bg-neutral-100" />
            <div className="flex gap-2 pt-3">
              <div className="h-3 w-12 animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-12 animate-pulse rounded bg-neutral-100" />
            </div>
            <div className="mt-auto flex items-center justify-between pt-3">
              <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
              <div className="h-8 w-24 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
          <div
            className={`m-3 h-24 w-24 shrink-0 animate-pulse self-center rounded-xl bg-neutral-100 sm:m-4 sm:h-28 sm:w-28 ${
              compact
                ? "md:order-first md:m-0 md:aspect-[4/3] md:h-auto md:w-full md:self-auto md:rounded-none"
                : ""
            }`}
          />
        </div>
      ))}
    </div>
  )
}

export function MenuMealCard({
  item,
  name,
  description,
  hasAddons = false,
  variant = "list",
  onAdd,
  onClick,
}: {
  item: MenuItem
  name: string
  description: string
  hasAddons?: boolean
  variant?: MenuCardVariant
  /**
   * Called when "Add" is pressed. Return `true` to signal the parent handled
   * the add (e.g. it opened the addon sheet); otherwise the card adds directly.
   */
  onAdd?: (target: AddonTargetState, hasAddons: boolean) => boolean | void
  onClick: () => void
}) {
  const mt = useTranslations("meals")
  const [servingIndex, setServingIndex] = useState(0)
  const [servingOpen, setServingOpen] = useState(false)
  const [added, setAdded] = useState(false)

  const { servings } = item
  const activeServing = servings.length > 0 ? servings[Math.min(servingIndex, servings.length - 1)] : null
  const displayPrice = activeServing?.price ?? item.price
  const displayCalories = activeServing?.calories ?? item.calories
  const displayProtein = activeServing?.nutrition?.protein_g ?? item.protein
  const displayCarbs = activeServing?.nutrition?.carbs_g ?? item.carbs
  const imgSrc = item.image || "/drink_sample.svg"
  const compact = variant === "compact"

  function handleAdd() {
    const key = activeServing
      ? `${name} (${activeServing.name ?? mt("servingFallback", { index: servingIndex + 1 })})`
      : name

    const handled = onAdd?.(
      { recipeId: item.id, name: key, price: displayPrice, image: imgSrc },
      hasAddons,
    )
    if (handled === true) return

    addCartItem({ name: key, price: displayPrice, image: imgSrc, recipeId: item.id })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article
      onClick={onClick}
      className={`group flex cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300 hover:shadow-sm ${
        compact ? "md:flex-col" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div className="min-w-0">
          <h3 className="font-nunito truncate text-base font-bold leading-tight text-neutral-900" title={name}>
            {name}
          </h3>
          {description && (
            <p className="font-nunito mt-1 line-clamp-2 text-xs text-neutral-500">{description}</p>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1 text-sm font-bold text-neutral-900">
            <Flame size={15} strokeWidth={2.5} className="text-orange-500" />
            {displayCalories}
          </span>
          <span className="flex items-center gap-0.5">
            <Beef size={11} className="text-macro-protein" />
            {displayProtein.toFixed(0)}g
          </span>
          <span className="flex items-center gap-0.5">
            <Wheat size={11} className="text-macro-carbs" />
            {displayCarbs.toFixed(0)}g
          </span>
        </div>

        {servings.length > 1 && (
          <div className="relative mt-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setServingOpen(!servingOpen) }}
              className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:border-neutral-300"
            >
              <span className="truncate">{activeServing?.name ?? mt("servingFallback", { index: servingIndex + 1 })}</span>
              <ChevronDown size={12} className={`shrink-0 transition-transform ${servingOpen ? "rotate-180" : ""}`} />
            </button>
            {servingOpen && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-md">
                {servings.map((serving, index) => (
                  <button
                    key={serving.id ?? index}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setServingIndex(index); setServingOpen(false) }}
                    className={`flex w-full items-center justify-between px-2.5 py-2 text-xs transition-colors hover:bg-neutral-50 ${
                      index === servingIndex ? "bg-neutral-50 font-semibold text-brand-900" : "text-neutral-600"
                    }`}
                  >
                    <span className="truncate">{serving.name ?? mt("servingFallback", { index: index + 1 })}</span>
                    {serving.price != null && (
                      <span className="ml-2 flex shrink-0 items-center gap-1">
                        <DirhamSign className="size-3" />
                        {serving.price}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-900">
            <DirhamSign className="size-3.5" />
            {displayPrice}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleAdd() }}
            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              added
                ? "bg-emerald-50 text-emerald-600"
                : "border border-neutral-900/15 text-neutral-800 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            {added ? (
              <>
                <Check size={13} />
                {mt("added")}
              </>
            ) : (
              <>
                <ShoppingCart size={13} />
                {mt("add")}
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className={`relative m-3 h-24 w-24 shrink-0 self-center overflow-hidden rounded-xl bg-neutral-100 sm:m-4 sm:h-28 sm:w-28 ${
          compact
            ? "md:order-first md:m-0 md:aspect-[4/3] md:h-auto md:w-full md:self-auto md:rounded-none"
            : ""
        }`}
      >
        <img
          src={imageVariant(imgSrc, 600)}
          srcSet={imageSrcSet(imgSrc, [96, 600])}
          sizes={
            compact
              ? "(max-width: 767px) 96px, (max-width: 1024px) 50vw, 25vw"
              : "(max-width: 640px) 96px, 112px"
          }
          alt={name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    </article>
  )
}
