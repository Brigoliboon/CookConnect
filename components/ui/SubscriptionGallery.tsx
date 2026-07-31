"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Trash2, Sun, Moon, Utensils, Users, Apple, Clock, Carrot, Ban, RefreshCw, Truck } from "lucide-react"
import { CARB_OPTIONS, ROTATION_MODES } from "@/constants"
import { ConfirmDialog } from "./ConfirmDialog"
import type { Subscription } from "@/constants"

const PER_PAGE = 5

const MEAL_TIME_ICONS: Record<string, typeof Clock> = {
  breakfast: Sun,
  "morning-snack": Apple,
  lunch: Utensils,
  "afternoon-snack": Apple,
  dinner: Moon,
}

interface SubscriptionGalleryProps {
  subscriptions: Subscription[]
  onDelete: (id: string) => void
}

export function SubscriptionGallery({ subscriptions, onDelete }: SubscriptionGalleryProps) {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = subscriptions.filter((s) =>
    s.customerName.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-2.5 pl-10 text-sm text-neutral-900 outline-none backdrop-blur-sm placeholder:text-neutral-400 focus:border-neutral-400"
            placeholder="Search by customer name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-xl border border-neutral-200 bg-white/80 px-4 py-2 text-xs font-semibold text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-neutral-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded-xl border border-neutral-200 bg-white/80 px-4 py-2 text-xs font-semibold text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {paginated.map((sub, i) => {
          const detail = sub.details as Record<string, unknown>
          const mealTimes = (detail.mealTimes as string[]) ?? []
          const restrictions = (detail.restrictions as string[]) ?? []
          const carbLabel = CARB_OPTIONS.find((c) => c.value === detail.preferredCarb)?.label ?? ""
          const rotationLabel = ROTATION_MODES.find((r) => r.value === detail.rotationMode)?.label ?? ""
          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="rounded-2xl border border-neutral-200/60 bg-white/80 p-5 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-neutral-900">{sub.customerName}</p>
                <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-400">
                  <span>Since {sub.createdAt}</span>
                  <button type="button" onClick={() => setDeleteTarget(sub.id)}
                    className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-400 transition-all hover:border-red-300 hover:bg-red-100 hover:text-red-600"
                    title="Delete subscription">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1"><Utensils size={12} />{String(detail.mealsPerWeek)}/wk</span>
                <span className="inline-flex items-center gap-1"><Users size={12} />{String(detail.servingsPerMeal)} svgs</span>
                <span className="inline-flex items-center gap-1 capitalize"><Apple size={12} />{String(detail.goal ?? "any")}</span>
                {carbLabel && <span className="inline-flex items-center gap-1"><Carrot size={12} />{carbLabel}</span>}
                <span className="inline-flex items-center gap-1"><RefreshCw size={12} />{rotationLabel}</span>
                <span className="inline-flex items-center gap-1"><Truck size={12} />{String(detail.deliveryTime ?? "—")}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex flex-wrap gap-1">
                  {mealTimes.map((t: string) => {
                    const Icon = MEAL_TIME_ICONS[t] ?? Clock
                    const label = ({ breakfast: "BF", "morning-snack": "Snack1", lunch: "Lunch", "afternoon-snack": "Snack2", dinner: "Dinner" })[t] ?? t
                    return (
                      <span key={t} className="inline-flex items-center gap-0.5 rounded-lg bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                        <Icon size={9} />{label}
                      </span>
                    )
                  })}
                </div>
                {restrictions.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-500">
                    <Ban size={10} />{restrictions.length} restriction{restrictions.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {String(detail.notes) && (
                <p className="mt-1.5 text-[10px] italic text-neutral-400">{String(detail.notes)}</p>
              )}
            </motion.div>
          )
        })}
        {paginated.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 py-16 text-center">
            <p className="text-sm font-medium text-neutral-500">No subscriptions found</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { onDelete(deleteTarget!); setDeleteTarget(null) }}
        title="Delete Subscription"
        message="Are you sure you want to delete this subscription? This action cannot be undone."
      />
    </div>
  )
}
