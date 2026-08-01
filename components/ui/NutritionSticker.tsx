"use client"

import { useRef } from "react"
import { toPng } from "html-to-image"
import { Download } from "lucide-react"
import type { MenuItem } from "@/constants"
import { slugify } from "@/utils/slugify"

export interface StickerMeal {
  name: string
  category?: string | null
  price?: number | null
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
  sugar: number
  sodium: number
  image_path?: string | null
}

export const MACRO_COLORS = {
  protein: "#FA6868",
  carbs: "#5A9CB5",
  fats: "#FACE68",
  fiber: "#79AE6F",
  sugar: "#E9C46A",
  sodium: "#7B5EA7",
}

export function toStickerMeal(item: MenuItem): StickerMeal {
  return {
    name: item.name,
    category: item.category,
    price: item.price,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fats: item.fats,
    fiber: item.fiber,
    sugar: item.sugar,
    sodium: item.sodium,
    image_path: item.image_path,
  }
}

interface NutritionStickerProps {
  meal: StickerMeal
  showDownload?: boolean
  filename?: string
}

export function NutritionSticker({ meal, showDownload = false, filename }: NutritionStickerProps) {
  const stickerRef = useRef<HTMLDivElement>(null)
  const downloadName = filename ?? `${slugify(meal.name) || "meal"}-sticker.png`

  const donutSegments = [
    { value: meal.protein * 4, color: MACRO_COLORS.protein, label: "Protein" },
    { value: meal.carbs * 4, color: MACRO_COLORS.carbs, label: "Carbs" },
    { value: meal.fats * 9, color: MACRO_COLORS.fats, label: "Fats" },
  ]
  const donutTotal = donutSegments.reduce((sum, s) => sum + s.value, 0) || 1
  const radius = 48
  const circumference = 2 * Math.PI * radius

  const nutritionRows = [
    { label: "Protein", value: meal.protein, unit: "g", color: MACRO_COLORS.protein },
    { label: "Carbs", value: meal.carbs, unit: "g", color: MACRO_COLORS.carbs },
    { label: "Fats", value: meal.fats, unit: "g", color: MACRO_COLORS.fats },
    { label: "Fiber", value: meal.fiber, unit: "g", color: MACRO_COLORS.fiber },
    { label: "Sugar", value: meal.sugar, unit: "g", color: MACRO_COLORS.sugar },
    { label: "Sodium", value: meal.sodium, unit: "mg", color: MACRO_COLORS.sodium },
  ]

  async function handleDownload() {
    if (!stickerRef.current) return
    try {
      const dataUrl = await toPng(stickerRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = downloadName
      link.click()
    } catch (e) {
      console.error("[STICKER] Download failed:", e)
    }
  }

  const sticker = (
    <div
      ref={stickerRef}
      className="flex w-[660px] gap-6 rounded-2xl bg-white p-7 text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
    >      {/* Column 1: brand + QR */}
      <div className="flex w-[250px] shrink-0 flex-col items-center gap-5 border-r border-neutral-100 pr-4">
        <img src="/logo-horizontal.png" alt="CookConnect" className="h-auto w-full" />
        <img src="/qr-code.png" alt="QR code" className="size-28" />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Scan Me!</p>
        <div className="flex items-center gap-4">
          <a
            href="https://www.instagram.com/cookconnectrestaurant"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="flex items-center gap-1.5"
          >
            <img src="https://cdn.simpleicons.org/instagram" alt="Instagram" className="size-4" />
            <span className="text-[9px] font-medium text-neutral-500">cookconnectrestaurant</span>
          </a>
          <a
            href="https://www.facebook.com/cookConnectLLC"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="flex items-center gap-1.5"
          >
            <img src="https://cdn.simpleicons.org/facebook" alt="Facebook" className="size-4" />
            <span className="text-[9px] font-medium text-neutral-500">cookConnectLLC</span>
          </a>
        </div>
      </div>

      {/* Column 2: meal + nutrition/graph */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <h3 className="font-nunito text-2xl font-bold leading-tight text-neutral-900">{meal.name}</h3>

        <div className="flex min-w-0 flex-1 gap-6">
          {/* Nutrition contents */}
          <div className="min-w-0 flex-1">
            <div className="divide-y divide-neutral-100 border-y border-neutral-100">
              {nutritionRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: row.color }} />
                    {row.label}
                  </span>
                  <span className="text-sm font-bold text-neutral-900">
                    {row.value}
                    <span className="ml-0.5 text-xs font-normal text-neutral-400">{row.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Graph */}
          <div className="flex shrink-0 flex-col items-center justify-center">
            <div className="relative">
              <svg width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={radius} fill="#ffffff" stroke="#f2f3f7" strokeWidth="14" />
                {(() => {
                  let offset = 0
                  return donutSegments.map((seg) => {
                    const ratio = seg.value / donutTotal
                    const dash = ratio * circumference
                    const el = (
                      <circle
                        key={seg.label}
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="14"
                        strokeLinecap="butt"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 64 64)"
                      />
                    )
                    offset += dash
                    return el
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-nunito text-xl font-extrabold leading-none text-neutral-900">
                  {meal.calories}
                </span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-neutral-400">
                  Calories
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px] font-medium text-neutral-500">
              {donutSegments.map((seg) => (
                <span key={seg.label} className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: seg.color }} />
                  {seg.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (!showDownload) return sticker

  return (
    <div className="flex w-fit flex-col items-center gap-3">
      {sticker}
      <button
        type="button"
        onClick={handleDownload}
        className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        <Download size={16} />
        Download PNG
      </button>
    </div>
  )
}
