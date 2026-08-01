"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download } from "lucide-react"
import { toPng } from "html-to-image"
import type { MenuItem } from "@/constants"
import { useAuth } from "@/hooks/AuthProvider"
import { slugify } from "@/utils/slugify"
import JsBarcode from "react-barcode"
import { NutritionSticker, toStickerMeal } from "./NutritionSticker"

interface MealDetailDialogProps {
  item: MenuItem | null
  onClose: () => void
  onEdit?: (item: MenuItem) => void
}

const macroColors: Record<string, string> = {
  protein: "#FA6868",
  carbs: "#5A9CB5",
  fats: "#FACE68",
  fiber: "#79AE6F",
  sugar: "#E9C46A",
  sodium: "#7B5EA7",
}

export function MealDetailDialog({ item, onClose, onEdit }: MealDetailDialogProps) {
  const imageUrl = item?.image_path ?? ""
  const { user } = useAuth()
  const isEmployee = user?.role === "employee"
  const stickerRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadSticker() {
    if (!stickerRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(stickerRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `${slugify(item?.name ?? "meal")}-sticker.png`
      link.click()
    } catch (e) {
      console.error("[MEAL_DETAIL] Sticker download failed:", e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="flex w-full max-w-lg max-h-[85vh] flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
              >
                  <X size={18} />
                </button>
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(item); onClose() }}
                    className="absolute right-14 top-4 rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                )}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 className="text-2xl font-bold text-white">{item.name}</h2>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-base font-extrabold text-white/90">
                    {item.calories}
                    <span className="ml-1 text-sm font-semibold text-white/60">Cal</span>
                  </p>
                  <span className="text-white/40">|</span>
                  <p className="text-base font-extrabold text-white/90">
                    {item.price}
                    <span className="ml-1 text-sm font-semibold text-white/60">DH</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="flex justify-center">
                <JsBarcode
                  value={item.id}
                  format="CODE128"
                  width={1}
                  height={28}
                  margin={0}
                  displayValue={false}
                  background="transparent"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-neutral-500">DESCRIPTION</p>
                <p className="text-sm leading-relaxed text-neutral-600">{item.description}</p>
              </div>

              {item.ingredients && item.ingredients.length > 0 && (
                <div>
                  <p className="mb-2.5 text-xs font-semibold text-neutral-500">INGREDIENTS</p>
                  <div className="flex flex-wrap gap-2">
                    {item.ingredients.map((ing, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-700"
                      >
                        {ing.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative size-28">
                  <svg className="size-full -rotate-90" viewBox="0 0 120 120">
                    {(() => {
                      const p = item.protein * 4
                      const c = item.carbs * 4
                      const f = item.fats * 9
                      const total = p + c + f || 1
                      const r = 48
                      const circ = 2 * Math.PI * r
                      const segments = [
                        { value: p, color: macroColors.protein, label: "Protein" },
                        { value: c, color: macroColors.carbs, label: "Carbs" },
                        { value: f, color: macroColors.fats, label: "Fats" },
                      ]
                      let offset = 0
                      return segments.map((seg) => {
                        const ratio = seg.value / total
                        const dash = ratio * circ
                        const el = (
                          <circle
                            key={seg.label}
                            cx="60"
                            cy="60"
                            r={r}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="14"
                            strokeDasharray={`${dash} ${circ - dash}`}
                            strokeDashoffset={-offset}
                          />
                        )
                        offset += dash
                        return el
                      })
                    })()}
                    <circle cx="60" cy="60" r="38" fill="white" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-nunito text-xl font-bold text-neutral-900">
                    {item.calories}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: macroColors.protein }} />
                    Protein
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: macroColors.carbs }} />
                    Carbs
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: macroColors.fats }} />
                    Fats
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold text-neutral-500">NUTRITIONAL CONTENT</p>
                <div className="divide-y divide-neutral-200 border-t border-b border-neutral-300 text-sm">
                  {[
                    { label: "Protein", value: item.protein, unit: "g", color: macroColors.protein },
                    { label: "Carbs", value: item.carbs, unit: "g", color: macroColors.carbs },
                    { label: "Fats", value: item.fats, unit: "g", color: macroColors.fats },
                    { label: "Fiber", value: item.fiber, unit: "g", color: macroColors.fiber },
                    { label: "Sugar", value: item.sugar, unit: "g", color: macroColors.sugar },
                    { label: "Sodium", value: item.sodium, unit: "mg", color: macroColors.sodium },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2.5">
                      <span className="flex items-center gap-2 font-medium text-neutral-800">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: row.color }} />
                        {row.label}
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {row.value}
                        <span className="ml-0.5 text-xs font-normal text-neutral-500">{row.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <span className="text-[10px] text-neutral-500">Nutrition data sourced from</span>
                <a href="https://www.fatsecret.com/" target="_blank" rel="noopener noreferrer">
                  <img src="/fatsecret-logo.svg" alt="FatSecret" className="h-4" />
                </a>
              </div>

              {isEmployee && (
                <button
                  onClick={handleDownloadSticker}
                  disabled={downloading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
                >
                  <Download size={16} />
                  {downloading ? "Generating..." : "Download Sticker"}
                </button>
              )}
            </div>
          </motion.div>

          {isEmployee && item && (
            <div className="pointer-events-none fixed -left-[9999px] top-0" aria-hidden="true">
              <div ref={stickerRef}>
                <NutritionSticker meal={toStickerMeal(item)} />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
