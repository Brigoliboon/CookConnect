"use client"

import { useState } from "react"
import Image from "next/image"
import { ShoppingCart, Check, Flame, Sun, Moon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAddMealToCart } from "@/components/modifiers/ModifierPickerProvider"
import { useModifierPrefetch } from "@/hooks/useModifierPrefetch"
import { imageVariant } from "@/lib/images"

interface GalleryCardProps {
  id?: string
  name: string
  price: number
  calories: number
  protein: number
  carbs: number
  fats: number
  description: string
  image: string
  variant?: "order" | "display"
  timeSlot?: "morning" | "night"
  className?: string
  onClick?: () => void
  onAdd?: (name: string, price: number, image: string) => void
  has_modifiers?: boolean
  has_addons?: boolean
}

export function GalleryCard({ id, name, price, calories, protein, carbs, fats, description, image, variant = "order", timeSlot, className, onClick, onAdd, has_modifiers = false, has_addons = false }: GalleryCardProps) {
  const t = useTranslations("meals")
  const tg = useTranslations("gallery")
  const addMealToCart = useAddMealToCart()
  const { elementRef, prefetch } = useModifierPrefetch<HTMLDivElement>(id, variant === "order" && Boolean(has_modifiers) && Boolean(id))
  const [added, setAdded] = useState(false)

  async function handleAdd() {
    const addedOk = await addMealToCart({ recipeId: id ?? "", name, price, image, hasModifiers: has_modifiers, hasAddons: has_addons })
    if (!addedOk) return
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div
      ref={elementRef}
      onClick={onClick}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
      className={`flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white drop-shadow-md transition-all duration-300 hover:drop-shadow-lg ${className ?? ""}`}
    >
      <div className="relative h-40 overflow-hidden">
        <Image
          src={imageVariant(image, 600)}
          alt={name}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, 241px"
          loading="lazy"
          decoding="async"
          className="object-cover transition-all duration-500 hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="font-nunito text-sm font-semibold text-black">{name}</p>
            {variant === "order" && (
              <p className="font-nunito shrink-0 text-sm font-bold text-black">{price} AED</p>
            )}
          </div>
          {variant === "display" && timeSlot && (
            <p className="font-nunito mt-1 inline-flex items-center gap-1 text-xs text-black/30">
              {timeSlot === "morning" ? <Sun size={12} /> : <Moon size={12} />}
              {timeSlot === "morning" ? tg("morning") : tg("night")}
            </p>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-black/30">
          <span className="font-nunito flex items-center gap-1 text-sm font-bold text-black"><Flame size={15} className="text-orange-500" /> {calories}</span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-md bg-macro-protein" />
            {protein}g
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-md bg-macro-carbs" />
            {carbs}g
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-md bg-macro-fat" />
            {fats}g
          </span>
        </div>
        {variant === "order" && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onAdd) onAdd(name, price, image)
              else handleAdd()
            }}
            className={`font-nunito mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
              added
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-brand-900/30 text-brand-900 drop-shadow-md hover:bg-brand-900/5"
            }`}
          >
            {added ? (
              <>
                <Check size={13} />
                {t("added")}
              </>
            ) : (
              <>
                <ShoppingCart size={13} />
                {t("add")}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
