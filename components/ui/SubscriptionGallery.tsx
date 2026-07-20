"use client"

import { useState } from "react"
import { Search, Trash2 } from "lucide-react"
import { Utensils, Users, Apple } from "lucide-react"
import { ConfirmDialog } from "./ConfirmDialog"
import type { Subscription } from "@/constants"

const PER_PAGE = 5

const DIET_ICONS: Record<string, typeof Utensils> = {
  any: Utensils,
  vegetarian: Apple,
  vegan: Apple,
  "high-protein": Utensils,
  "low-carb": Utensils,
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
          const DietIcon = DIET_ICONS[detail.dietaryPreference as string] ?? Utensils
          return (
            <div key={sub.id} className="flex items-center justify-between bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-brand-900">{sub.customerName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <Utensils size={12} />
                    {String(detail.mealsPerWeek)} meals/wk
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} />
                    {String(detail.servingsPerMeal)} servings
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <DietIcon size={12} />
                    <span className="capitalize">{String(detail.dietaryPreference)}</span>
                  </span>
                </div>
                {String(detail.notes) && (
                  <p className="mt-1 text-xs italic text-text-secondary">{String(detail.notes)}</p>
                )}
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-3 text-right text-xs text-text-secondary">
                <p>Since {sub.createdAt}</p>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(sub.id)}
                  className="rounded-lg border border-red-200 p-1.5 text-red-400 transition-colors hover:border-red-400 hover:text-red-600"
                  title="Delete subscription"
                >
                  <Trash2 size={16} />
                </button>
              </div>
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
