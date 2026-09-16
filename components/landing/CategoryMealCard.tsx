"use client"

import { useState } from "react"
import Image from "next/image"
import { Flame, ShoppingCart, Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { getCart, setCart } from "@/utils/cart"

interface CategoryMealCardProps {
  id: string
  name: string
  image: string
  price?: number
  calories?: number
}

export function CategoryMealCard({ id, name, image, price = 0, calories = 0 }: CategoryMealCardProps) {
  const t = useTranslations("meals")
  const [added, setAdded] = useState(false)

  function handleAdd() {
    const cart = getCart()
    const existing = cart.find((item) => item.name === name)
    if (existing) {
      existing.qty += 1
    } else {
      cart.push({ name, price, qty: 1, image, recipeId: id, basePrice: price })
    }
    setCart(cart)
    window.dispatchEvent(new Event("cart-changed"))
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <li className="flex flex-col border border-neutral-200 bg-white p-3">
      <Image src={image} alt={name} width={600} height={600} loading="lazy" className="aspect-square w-full object-cover" />
      <p className="font-nunito mt-2 text-sm font-semibold text-neutral-900 line-clamp-1" title={name}>
        {name}
      </p>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-neutral-500">
          <Flame size={12} className="text-orange-400" />
          {calories} Cal
        </span>
        <span className="text-sm font-bold text-brand-900">AED {price}</span>
      </div>
      <div className="mt-2 flex justify-end border-t border-neutral-100 pt-2">
        <button
          onClick={handleAdd}
          className={`flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
            added
              ? "bg-emerald-50 text-emerald-600"
              : "border border-neutral-900/15 text-neutral-800 hover:bg-neutral-900 hover:text-white"
          }`}
        >
          {added ? (
            <>
              <Check size={14} />
              {t("added")}
            </>
          ) : (
            <>
              <ShoppingCart size={14} />
              {t("add")}
            </>
          )}
        </button>
      </div>
    </li>
  )
}
