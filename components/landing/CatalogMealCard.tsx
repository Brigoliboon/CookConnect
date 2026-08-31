"use client"

import { useState } from "react"
import Image from "next/image"
import { ShoppingCart, Check, Flame, Beef, Wheat, Bubbles, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { getCart, setCart } from "@/utils/cart"
import type { MealServingOption } from "@/constants"

const fallbackImages: Record<string, string> = {
  beef: "/placeholder/empty_plate.svg",
  chicken: "/placeholder/empty_plate.svg",
  seafood: "/placeholder/empty_plate.svg",
  salad: "/placeholder/empt_salad_bowl.png",
  wrap: "/placeholder/empty_plate.svg",
  breakfast: "/placeholder/empty_bowl.png",
  pasta: "/placeholder/empty_plate.svg",
  soup: "/placeholder/empty_bowl.png",
  pizza: "/placeholder/empty_plate.svg",
  burgers: "/placeholder/empty_plate.svg",
  drinks: "/drink_sample.svg",
  biryani: "/placeholder/empty_plate.svg",
  risotto: "/placeholder/empty_plate.svg",
  smoothie: "/drink_sample.svg",
  juice: "/drink_sample.svg",
  beverages: "/drink_sample.svg",
  desserts: "/drink_sample.svg",
  "rice-sides": "/placeholder/empty_plate.svg",
  platters: "/drink_sample.svg",
  vegetable: "/placeholder/empty_plate.svg",
}

const catColors: Record<string, string> = {
  chicken: "bg-cat-chicken",
  beef: "bg-cat-beef",
  seafood: "bg-cat-seafood",
  salad: "bg-cat-salad",
  wrap: "bg-cat-wrap",
  breakfast: "bg-cat-breakfast",
  pasta: "bg-cat-pasta",
  soup: "bg-cat-soup",
}

const catBgs: Record<string, string> = {
  salad: "/meal-backgrounds/salad.jpg",
}

const defaultBg = "/meal-backgrounds/meal.jpg"

interface CatalogMealCardProps {
  id: string
  name: string
  category: string
  description: string
  image: string
  price?: number
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
  servings?: MealServingOption[]
}

export function CatalogMealCard({
  id,
  name,
  category,
  description,
  image,
  price = 0,
  calories = 0,
  protein = 0,
  carbs = 0,
  fats = 0,
  servings,
}: CatalogMealCardProps) {
  const t = useTranslations("meals")
  const [servingIndex, setServingIndex] = useState(0)
  const [servingOpen, setServingOpen] = useState(false)
  const [added, setAdded] = useState(false)

  const activeServing = servings && servings.length > 0 ? servings[Math.min(servingIndex, servings.length - 1)] : null
  const displayPrice = activeServing?.price ?? price
  const displayCalories = activeServing?.calories ?? calories
  const displayProtein = activeServing?.nutrition?.protein_g ?? protein
  const displayCarbs = activeServing?.nutrition?.carbs_g ?? carbs
  const displayFats = activeServing?.nutrition?.fats_g ?? fats
  const imgSrc = image || fallbackImages[category] || "/drink_sample.svg"

  function handleAdd() {
    const cart = getCart()
    const key = activeServing ? `${name} (${activeServing.name ?? t("servingFallback", { index: servingIndex + 1 })})` : name
    const existing = cart.find((item) => item.name === key)
    if (existing) {
      existing.qty += 1
    } else {
      cart.push({ name: key, price: displayPrice, qty: 1, image: imgSrc })
    }
    setCart(cart)
    window.dispatchEvent(new Event("cart-changed"))
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="group overflow-hidden border border-neutral-100 bg-white transition-colors hover:shadow-md">
      <div
        className="relative h-28 w-full overflow-hidden bg-neutral-100 sm:h-32"
        style={{ backgroundImage: `url(${catBgs[category] ?? defaultBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-28 w-28 overflow-hidden sm:h-26 sm:w-26">
            <Image
              src={imgSrc}
              alt={name}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
        </div>
        {category && (
          <span className={`absolute left-2 top-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white sm:text-[10px] ${catColors[category] ?? "bg-neutral-600"}`}>
            {category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 pt-2.5 sm:p-4">
        <h3 className="font-nunito text-sm font-bold leading-tight text-neutral-900 line-clamp-1 sm:text-[15px]" title={name}>
          {name}
        </h3>

        <div className="flex items-center gap-2.5 text-[10px] text-neutral-500 sm:text-[11px]">
          <span className="flex items-center gap-0.5">
            <Flame size={10} className="text-orange-400" />
            {displayCalories}
          </span>
          <span className="flex items-center gap-0.5">
            <Beef size={10} className="text-macro-protein" />
            {displayProtein.toFixed(0)}g
          </span>
          <span className="flex items-center gap-0.5">
            <Wheat size={10} className="text-macro-carbs" />
            {displayCarbs.toFixed(0)}g
          </span>
          <span className="flex items-center gap-0.5">
            <Bubbles size={10} className="text-macro-fat" />
            {displayFats.toFixed(0)}g
          </span>
        </div>

        {servings && servings.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setServingOpen(!servingOpen)}
              className="flex w-full items-center justify-between border border-neutral-200 px-2 py-1 text-[10px] text-neutral-600 transition-colors hover:border-neutral-300 sm:text-xs"
            >
              <span className="truncate">{activeServing?.name ?? t("servingFallback", { index: servingIndex + 1 })}</span>
              <ChevronDown size={10} className={`shrink-0 transition-transform ${servingOpen ? "rotate-180" : ""}`} />
            </button>
            {servingOpen && (
              <div className="absolute inset-x-0 top-full z-20 mt-px border border-neutral-200 bg-white shadow-sm">
                {servings.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setServingIndex(i); setServingOpen(false) }}
                    className={`flex w-full items-center justify-between px-2 py-1.5 text-[10px] transition-colors hover:bg-neutral-50 sm:text-xs ${
                      i === servingIndex ? "bg-neutral-50 font-semibold text-brand-900" : "text-neutral-600"
                    }`}
                  >
                    <span className="truncate">{s.name ?? t("servingFallback", { index: i + 1 })}</span>
                    {s.price != null && <span className="shrink-0 ml-2">{s.price} AED</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
          <span className="shrink-0 text-[11px] font-bold text-brand-900 sm:text-[15px]">{displayPrice} AED</span>
          <button
            onClick={handleAdd}
            className={`shrink-0 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-semibold transition-all sm:px-4 sm:text-xs ${
              added
                ? "bg-emerald-50 text-emerald-600"
                : "border border-neutral-900/15 text-neutral-800 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            {added ? (
              <>
                <Check size={11} />
                {t("added")}
              </>
            ) : (
              <>
                <ShoppingCart size={11} />
                {t("add")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}