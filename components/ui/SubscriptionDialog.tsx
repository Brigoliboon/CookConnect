"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Sun, Moon, Utensils, Users, Apple, Clock, Carrot, Ban, RefreshCw, Truck, BadgeX, CalendarDays } from "lucide-react"
import { CARB_OPTIONS, ROTATION_MODES } from "@/constants"
import { ConfirmDialog } from "./ConfirmDialog"
import type { SubscriptionStatus } from "@/lib/supabase/models"

const MEAL_TIME_ICONS: Record<string, typeof Clock> = {
  breakfast: Sun,
  "morning-snack": Apple,
  lunch: Utensils,
  "afternoon-snack": Apple,
  dinner: Moon,
}

interface SubscriptionRow {
  id: string
  customer_name: string
  customer_email: string
  details: Record<string, unknown>
  status: SubscriptionStatus
  created_at: string
}

interface SubscriptionDialogProps {
  open?: boolean
  onClose?: () => void
  subscriptions: SubscriptionRow[]
  loading?: boolean
  onCancel: (id: string) => Promise<void>
  inline?: boolean
}

export function SubscriptionDialog({ open, onClose, subscriptions, loading, onCancel, inline = false }: SubscriptionDialogProps) {
  const [search, setSearch] = useState("")
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)

  const filtered = subscriptions.filter((s) =>
    s.customer_name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCancel(id: string) {
    try {
      await onCancel(id)
    } finally {
      setCancelTarget(null)
    }
  }

  const searchInput = (
    <div className="relative">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by customer name..."
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 pl-9 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
      />
    </div>
  )

  const listBody = loading ? (
    Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
    ))
  ) : filtered.length === 0 ? (
    <div className="py-16 text-center">
      <BadgeX size={36} className="mx-auto mb-3 text-neutral-300" />
      <p className="text-sm font-medium text-neutral-500">No subscriptions found</p>
    </div>
  ) : (
    filtered.map((sub, i) => {
      const detail = sub.details
      const mealTimes = (detail.mealTimes as string[]) ?? []
      const restrictions = (detail.restrictions as string[]) ?? []
      const carbLabel = CARB_OPTIONS.find((c) => c.value === detail.preferredCarb)?.label ?? ""
      const rotationLabel = ROTATION_MODES.find((r) => r.value === detail.rotationMode)?.label ?? ""
      return (
        <motion.div
          key={sub.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
          className={`rounded-2xl border p-5 transition-all ${
            sub.status === "cancelled"
              ? "border-red-100 bg-red-50/50"
              : "border-neutral-200/60 bg-white hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-neutral-900">{sub.customer_name}</p>
                {sub.status === "cancelled" && (
                  <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">Cancelled</span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-neutral-400">{sub.customer_email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                <CalendarDays size={11} />
                {sub.created_at?.split("T")[0]}
              </span>
              {sub.status === "active" && (
                <button
                  onClick={() => setCancelTarget(sub.id)}
                  className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition-all hover:bg-red-100"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
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
        </motion.div>
      )
    })
  )

  const confirmDialog = (
    <ConfirmDialog
      open={cancelTarget !== null}
      onClose={() => setCancelTarget(null)}
      onConfirm={() => handleCancel(cancelTarget!)}
      title="Cancel Subscription"
      message="Are you sure you want to cancel this subscription? The customer will lose access to their meal plan."
    />
  )

  if (inline) {
    return (
      <>
        <div className="space-y-4">
          {searchInput}
          <div className="space-y-3">{listBody}</div>
          {!loading && filtered.length > 0 && (
            <p className="text-center text-xs text-neutral-400">
              {filtered.length} of {subscriptions.length} shown
            </p>
          )}
        </div>
        {confirmDialog}
      </>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Subscriptions</h2>
                <p className="mt-0.5 text-xs text-neutral-500">{subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-neutral-100 px-6 py-4">
              {searchInput}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
              {listBody}
            </div>

            <div className="border-t border-neutral-100 px-6 py-4">
              <p className="text-center text-xs text-neutral-400">
                {filtered.length} of {subscriptions.length} shown
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
      {confirmDialog}
    </AnimatePresence>
  )
}
