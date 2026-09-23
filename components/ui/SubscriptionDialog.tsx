"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Sun, Moon, Utensils, Apple, Clock, Carrot, Ban, RefreshCw, Truck, BadgeX, CalendarDays } from "lucide-react"
import { CARB_OPTIONS, ROTATION_MODES, FOOD_RESTRICTIONS } from "@/constants"
import { ConfirmDialog } from "./ConfirmDialog"
import { Modal } from "./Modal"
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
  customer_name?: string
  customer_email?: string
  details: Record<string, unknown>
  status: SubscriptionStatus
  created_at: string
}

function displayName(s: SubscriptionRow) {
  return s.customer_name ?? (s.details?.name as string | undefined) ?? "Guest"
}

function displayEmail(s: SubscriptionRow) {
  return s.customer_email ?? (s.details?.email as string | undefined) ?? (s.details?.mobile_number as string | undefined) ?? ""
}

interface SubscriptionDialogProps {
  open?: boolean
  onClose?: () => void
  subscriptions: SubscriptionRow[]
  loading?: boolean
  onCancel: (id: string) => Promise<void>
  inline?: boolean
  payments?: Record<string, { paid: number; total: number | null }>
  onPaymentsChanged?: () => void
}

function paymentPill(paid: number, total: number | null) {
  if (total === null) return null
  const fmt = (c: number) => `${(c / 100).toFixed(2)}`
  const base = "px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide"
  if (paid <= 0) return <span className={`${base} bg-red-100 text-red-700`}>Unpaid · lacks {fmt(total)}</span>
  if (paid < total) return <span className={`${base} bg-amber-100 text-amber-800`}>Partial · lacks {fmt(total - paid)}</span>
  return <span className={`${base} bg-emerald-100 text-emerald-800`}>Paid · {fmt(paid)}</span>
}

export function SubscriptionDialog({ open, onClose, subscriptions, loading, onCancel, inline = false, payments, onPaymentsChanged }: SubscriptionDialogProps) {
  const [search, setSearch] = useState("")
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [ingNames, setIngNames] = useState<Record<string, string>>({})
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("bank-transfer")
  const [payRef, setPayRef] = useState("")
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const detail = detailId ? subscriptions.find((s) => s.id === detailId) ?? null : null

  async function handleRecordPayment() {
    if (!detail) return
    const total = payments?.[detail.id]?.total ?? null
    const paid = payments?.[detail.id]?.paid ?? 0
    const amount = Math.round(Number(payAmount) * 100)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Enter an amount greater than 0.")
      return
    }
    if (total !== null && paid + amount > total) {
      setPayError(`Exceeds balance of ${((total - paid) / 100).toFixed(2)}.`)
      return
    }
    setPaying(true)
    setPayError("")
    try {
      const res = await fetch("/api/subscription-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: detail.id, amount_cents: amount, method: payMethod, reference: payRef || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to record payment")
      setPayAmount("")
      setPayRef("")
      onPaymentsChanged?.()
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Failed to record payment")
    } finally {
      setPaying(false)
    }
  }

  function restrictionLabel(id: string): string | null {    const staticLabel = FOOD_RESTRICTIONS.find((f) => f.value === id)?.label
    if (staticLabel) return staticLabel
    const stored = (detail?.details as Record<string, unknown> | undefined)?.restrictionNames as Record<string, string> | undefined
    if (stored?.[id]) return stored[id]
    return ingNames[id] ?? null
  }

  useEffect(() => {
    const ids = ((detail?.details?.restrictions as string[] | undefined) ?? []).filter(
      (id) => !FOOD_RESTRICTIONS.some((f) => f.value === id) && !ingNames[id],
    )
    if (ids.length === 0) return
    fetch(`/api/ingredients?ids=${ids.join(",")}&limit=200`)
      .then((r) => r.json())
      .then((d) =>
        setIngNames((prev) => ({
          ...prev,
          ...Object.fromEntries(((d.data ?? []) as { id: string; name: string }[]).map((i) => [i.id, i.name])),
        })),
      )
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id])

  const filtered = subscriptions.filter((s) =>
    displayName(s).toLowerCase().includes(search.toLowerCase())
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
          onClick={() => setDetailId(sub.id)}
          className={`cursor-pointer border p-4 transition-all sm:rounded-2xl sm:p-5 ${
            sub.status === "cancelled"
              ? "border-red-100 bg-red-50/50"
              : "border-neutral-200/60 bg-white hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-nunito min-w-0 truncate text-sm font-semibold text-neutral-900 sm:text-base">{displayName(sub)}</p>
                {sub.status === "cancelled" && (
                  <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">Cancelled</span>
                )}
                {payments?.[sub.id] && paymentPill(payments[sub.id].paid, payments[sub.id].total)}
              </div>
              <p className="font-nunito mt-0.5 truncate text-[11px] text-neutral-400 sm:text-xs">{displayEmail(sub)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <span className="font-nunito flex items-center gap-1 text-[10px] text-neutral-400 sm:text-[11px]">
                <CalendarDays size={11} />
                {sub.created_at?.split("T")[0]}
              </span>
              {sub.status === "active" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCancelTarget(sub.id)
                  }}
                  className="font-nunito bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-500 transition-all hover:bg-red-100 sm:text-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="font-nunito mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-extrabold text-neutral-900">
            <span className="inline-flex items-center gap-1.5"><Utensils size={14} />{String((detail.mealsPerDay as number | undefined) ?? 1)}/day</span>
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
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-red-600">
                <Ban size={13} />{restrictions.length} restriction{restrictions.length > 1 ? "s" : ""}
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

  const detailDialog = (
    <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail ? displayName(detail) : "Subscription"}>
      {detail && (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-neutral-500">Email</span><span className="font-semibold">{displayEmail(detail)}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Status</span><span className="font-semibold capitalize">{detail.status}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Meals per day</span><span className="font-semibold">{(detail.details?.mealsPerDay as number | undefined) ?? 1} / 5 max</span></div>
          {payments?.[detail.id] && (
            <div className="border-t border-neutral-100 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Payment status</span>
                {paymentPill(payments[detail.id].paid, payments[detail.id].total)}
              </div>
              <div className="mt-1 flex justify-between text-xs text-neutral-400">
                <span>
                  Paid {(payments[detail.id].paid / 100).toFixed(2)}
                  {payments[detail.id].total !== null ? ` / ${(payments[detail.id].total! / 100).toFixed(2)}` : ""}
                </span>
                {payments[detail.id].total !== null && payments[detail.id].paid < payments[detail.id].total! && (
                  <span>Lacks {((payments[detail.id].total! - payments[detail.id].paid) / 100).toFixed(2)}</span>
                )}
              </div>
              {(payments[detail.id].total === null || payments[detail.id].paid < payments[detail.id].total!) && (
                <div className="mt-2 space-y-2 border-t border-neutral-100 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Amount (AED)"
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                    />
                    <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900">
                      <option value="bank-transfer">Bank Transfer</option>
                      <option value="cod">Cash on Delivery</option>
                      <option value="restaurant">Pay at Restaurant</option>
                      <option value="tabby">Tabby</option>
                    </select>
                  </div>
                  <input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="Reference (optional)"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                  />
                  {payError && <p className="text-xs font-medium text-red-500">{payError}</p>}
                  <button
                    onClick={handleRecordPayment}
                    disabled={paying}
                    className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-40"
                  >
                    {paying ? "Recording..." : "Add payment"}
                  </button>
                </div>
              )}
            </div>
          )}
          {(detail.details?.includedMeals as string[] | undefined)?.length ? (
            <div>
              <p className="text-neutral-500">Meals ({(detail.details.includedMeals as string[]).length})</p>
              <ul className="mt-1 list-disc pl-5 text-neutral-800">
                {(detail.details.includedMeals as string[]).map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(detail.details?.restrictions as string[] | undefined)?.length ? (
            <div>
              <p className="text-neutral-500">Restrictions</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(detail.details.restrictions as string[]).map((r) => {
                  const label = restrictionLabel(r)
                  if (!label) return null
                  return (
                    <span key={r} className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-600">{label}</span>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-neutral-100 pt-2">
            <span className="text-neutral-500">Delivery</span>
            <span className="font-semibold">
              {(detail.details?.deliveryDays as string[] | undefined)?.join(", ") || (detail.details?.deliveryTime as string | undefined) || "—"}
            </span>
          </div>
          {typeof detail.details?.notes === "string" && detail.details.notes ? (
            <div><p className="text-neutral-500">Notes</p><p className="font-medium">{detail.details.notes as string}</p></div>
          ) : null}
        </div>
      )}
    </Modal>
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
        {detailDialog}
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
      {detailDialog}
    </AnimatePresence>
  )
}
