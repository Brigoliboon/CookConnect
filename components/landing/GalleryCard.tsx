"use client"

import { useState } from "react"
import { ShoppingCart, Check, Flame, Sun, Moon } from "lucide-react"
import { useTranslations } from "next-intl"
import { getCart, setCart } from "@/utils/cart"

interface GalleryCardProps {
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
}

export function GalleryCard({ name, price, calories, protein, carbs, fats, description, image, variant = "order", timeSlot, className, onClick, onAdd }: GalleryCardProps) {
  const t = useTranslations("meals")
  const tg = useTranslations("gallery")
  const [added, setAdded] = useState(false)

  function handleAdd() {
    const cart = getCart()
    const existing = cart.find((item) => item.name === name)
    if (existing) {
      existing.qty += 1
    } else {
      cart.push({ name, price, qty: 1, image })
    }
    setCart(cart)
    window.dispatchEvent(new Event("cart-changed"))
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div
      onClick={onClick}
      className={`flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white drop-shadow-md transition-all duration-300 hover:drop-shadow-lg ${className ?? ""}`}
    >
      <div className="overflow-hidden">
        <img
          src={image}
          alt={name}
          className="h-40 w-full object-cover transition-all duration-500 hover:scale-105"
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
