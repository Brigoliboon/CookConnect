"use client"

import { useState } from "react"
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
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            className="w-full rounded-lg border border-border-light py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="Search by customer name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-border-light px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-400/10 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded-lg border border-border-light px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-400/10 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-px overflow-hidden rounded-xl border border-border-light bg-border-light">
        {paginated.map((sub) => {
          const detail = sub.details as Record<string, unknown>
          const mealTimes = (detail.mealTimes as string[]) ?? []
          const restrictions = (detail.restrictions as string[]) ?? []
          const carbLabel = CARB_OPTIONS.find((c) => c.value === detail.preferredCarb)?.label ?? ""
          const rotationLabel = ROTATION_MODES.find((r) => r.value === detail.rotationMode)?.label ?? ""
          return (
            <div key={sub.id} className="bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-brand-900">{sub.customerName}</p>
                <div className="flex shrink-0 items-center gap-3 text-xs text-text-secondary">
                  <span>Since {sub.createdAt}</span>
                  <button type="button" onClick={() => setDeleteTarget(sub.id)}
                    className="rounded-lg border border-red-200 p-1.5 text-red-400 hover:border-red-400 hover:text-red-600"
                    title="Delete subscription">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1"><Utensils size={12} />{String(detail.mealsPerWeek)}/wk</span>
                <span className="inline-flex items-center gap-1"><Users size={12} />{String(detail.servingsPerMeal)} svgs</span>
                <span className="inline-flex items-center gap-1 capitalize"><Apple size={12} />{String(detail.goal ?? "any")}</span>
                {carbLabel && <span className="inline-flex items-center gap-1"><Carrot size={12} />{carbLabel}</span>}
                <span className="inline-flex items-center gap-1"><RefreshCw size={12} />{rotationLabel}</span>
                <span className="inline-flex items-center gap-1"><Truck size={12} />{String(detail.deliveryTime ?? "—")}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex flex-wrap gap-1">
                  {mealTimes.map((t: string) => {
                    const Icon = MEAL_TIME_ICONS[t] ?? Clock
                    const label = ({ breakfast: "BF", "morning-snack": "Snack1", lunch: "Lunch", "afternoon-snack": "Snack2", dinner: "Dinner" })[t] ?? t
                    return (
                      <span key={t} className="inline-flex items-center gap-0.5 rounded bg-brand-400/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-900">
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
                <p className="mt-1 text-[10px] italic text-text-secondary">{String(detail.notes)}</p>
              )}
            </div>
          )
        })}
        {paginated.length === 0 && (
          <div className="bg-white px-5 py-8 text-center text-sm text-text-secondary">
            No subscriptions found
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
