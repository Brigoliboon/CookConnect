"use client"

import { ShoppingCart, Flame } from "lucide-react"

interface GalleryCardProps {
  name: string
  price: number
  calories: number
  protein: number
  carbs: number
  fats: number
  description: string
  image: string
  onClick?: () => void
}

export function GalleryCard({ name, price, calories, protein, carbs, fats, description, image, onClick }: GalleryCardProps) {

  return (
    <div
      onClick={onClick}
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white drop-shadow-md transition-all duration-300 hover:drop-shadow-lg"
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
            <p className="font-nunito shrink-0 text-sm font-bold text-black">{price} AED</p>
          </div>
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
        <button className="font-nunito mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-900/30 py-2.5 text-xs font-semibold text-brand-900 drop-shadow-md transition-all hover:bg-brand-900/5">
          <ShoppingCart size={13} />
          Add to Order
        </button>
      </div>
    </div>
  )
}
