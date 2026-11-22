"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BadgeCheck,
  BadgeX,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDollarSign,
  CircleOff,
  ListFilter,
  Mail,
  MapPin,
  Pause,
  Phone,
  PhoneCall,
  Play,
  Search,
  ShieldAlert,
  StickyNote,
  Truck,
  User,
  Users,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { DetailSheet } from "@/components/subscriptions/DetailSheet"
import {
  displayContact,
  displayName,
  lifecycleOf,
  planLabel,
  type Lifecycle,
  type SubscriptionListItem,
} from "@/components/subscriptions/helpers"
import { SubscriptionRow } from "@/components/subscriptions/SubscriptionRow"
import { isIngredientUuid, restrictionDisplayItems, restrictionMatchFromDetails } from "@/lib/subscription/restrictions"
import { Button } from "./Button"
import { ConfirmDialog } from "./ConfirmDialog"
import { Modal } from "./Modal"

type PayState = "paid" | "partial" | "unpaid" | "unknown"

function payStateOf(paid: number | undefined, total: number | null | undefined): PayState {
  if (total === undefined || total === null) return "unknown"
  if ((paid ?? 0) <= 0) return "unpaid"
  if ((paid ?? 0) < total) return "partial"
  return "paid"
}

function mealsPerDay(s: SubscriptionListItem) {
  const value = s.details?.mealsPerDay
  return typeof value === "number" ? value : 1
}


const STATUS_ICON: Record<Lifecycle, LucideIcon> = {
  active: CheckCircle2,
  paused: Pause,
  depleted: CircleOff,
  cancelled: Ban,
}

const PAY_ICON: Record<PayState, LucideIcon> = {
  paid: BadgeCheck,
  partial: CircleDollarSign,
  unpaid: CircleAlert,
  unknown: Wallet,
}

interface SubscriptionDialogProps {
  open?: boolean
  onClose?: () => void
  subscriptions: SubscriptionListItem[]
  loading?: boolean
  onCancel: (id: string) => Promise<void>
  onPause?: (id: string) => Promise<void>
  onResume?: (id: string) => Promise<void>
  inline?: boolean
  payments?: Record<string, { paid: number; total: number | null }>
  onPaymentsChanged?: () => void
  onUpdated?: () => void
}

function aed(cents: number) {
  return (cents / 100).toFixed(0)
}

function paymentLabel(paid: number, total: number | null) {
  if (total === null) return null
  if (paid <= 0) return `Unpaid · ${aed(total)} AED`
  if (paid < total) return `Partial · ${aed(paid)} / ${aed(total)} AED`
  return `Paid · ${aed(paid)} AED`
}

function sanitizeUaLocal(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("971")) digits = digits.slice(3)
  else if (digits.startsWith("0971")) digits = digits.slice(4)
  else if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(0, 9)
}

function deliveryLabel(details: Record<string, unknown>): string {
  if (details.onCall) return "On-call"
  const days = (details.days as string[] | undefined) ?? (details.deliveryDays as string[] | undefined) ?? []
  const slots = (details.slots as string[] | undefined)
    ?? (details.slot ? [String(details.slot)] : [])
  const time = typeof details.deliveryTime === "string" ? details.deliveryTime : ""
  const parts = [days.length ? `${days.length} days` : "", slots.join(", "), time].filter(Boolean)
  return parts.join(" · ") || "Scheduled"
}

const fieldClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"

const selectClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"

export function SubscriptionDialog({
  open,
  onClose,
  subscriptions,
  loading,
  onCancel,
  onPause,
  onResume,
  inline = false,
  payments,
  onPaymentsChanged,
  onUpdated,
}: SubscriptionDialogProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | Lifecycle>(inline ? "active" : "all")
  const [payFilter, setPayFilter] = useState<"all" | Exclude<PayState, "unknown">>("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "on-call" | "scheduled">("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [pauseTarget, setPauseTarget] = useState<{ id: string; action: "pause" | "resume" } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [ingNames, setIngNames] = useState<Record<string, string>>({})
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("bank-transfer")
  const [payRef, setPayRef] = useState("")
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editMobile, setEditMobile] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveOk, setSaveOk] = useState(false)
  const detail = detailId ? subscriptions.find((s) => s.id === detailId) ?? null : null

  const plans = useMemo(() => {
    const names = new Set<string>()
    for (const sub of subscriptions) names.add(planLabel(sub))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [subscriptions])

  const counts = useMemo(() => {
    const status: Record<Lifecycle | "all", number> = { all: subscriptions.length, active: 0, paused: 0, depleted: 0, cancelled: 0 }
    const pay: Record<PayState | "all", number> = { all: subscriptions.length, paid: 0, partial: 0, unpaid: 0, unknown: 0 }
    for (const sub of subscriptions) {
      status[lifecycleOf(sub)] += 1
      const payment = payments?.[sub.id]
      pay[payStateOf(payment?.paid, payment?.total)] += 1
    }
    return { status, pay }
  }, [subscriptions, payments])

  function openDetails(sub: SubscriptionListItem) {
    const d = sub.details ?? {}
    setEditName(String(d.name ?? displayName(sub)))
    setEditEmail(String(d.email ?? sub.customer_email ?? sub.customer?.email ?? ""))
    setEditMobile(String(d.mobile_number ?? ""))
    setEditAddress(String(d.address ?? ""))
    setSaveError("")
    setSaveOk(false)
    setPayError("")
    setPayAmount("")
    setPayRef("")
    setDetailId(sub.id)
  }

  async function handleSaveDetails() {
    if (!detail) return
    const name = editName.trim()
    const address = editAddress.trim()
    const email = editEmail.trim()
    const local = sanitizeUaLocal(editMobile)
    if (!name || !address) {
      setSaveError("Name and address are required.")
      setSaveOk(false)
      return
    }
    if (local.length !== 9) {
      setSaveError("Enter a UAE WhatsApp number (9 digits after +971).")
      setSaveOk(false)
      return
    }
    if (email && !email.includes("@")) {
      setSaveError("Email is invalid.")
      setSaveOk(false)
      return
    }
    setSaving(true)
    setSaveError("")
    setSaveOk(false)
    try {
      const res = await fetch(`/api/subscriptions/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          details: {
            name,
            email: email || null,
            mobile_number: `+971${local}`,
            address,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save details")
      setEditMobile(`+971${local}`)
      setSaveOk(true)
      onUpdated?.()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save details")
    } finally {
      setSaving(false)
    }
  }

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

  useEffect(() => {
    const ids = restrictionMatchFromDetails(detail?.details).restrictedIngredientIds.filter(
      (id) => isIngredientUuid(id) && !ingNames[id],
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

  const filtered = subscriptions.filter((s) => {
    const q = search.trim().toLowerCase()
    if (q) {
      const hay = [
        displayName(s),
        displayContact(s),
        String(s.details?.address ?? ""),
        planLabel(s),
      ].join(" ").toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (statusFilter !== "all" && lifecycleOf(s) !== statusFilter) return false
    if (payFilter !== "all") {
      const payment = payments?.[s.id]
      if (payStateOf(payment?.paid, payment?.total) !== payFilter) return false
    }
    if (planFilter !== "all" && planLabel(s) !== planFilter) return false
    const onCall = Boolean(s.details?.onCall)
    if (deliveryFilter === "on-call" && !onCall) return false
    if (deliveryFilter === "scheduled" && onCall) return false
    return true
  })

  async function handleCancel(id: string) {
    try {
      await onCancel(id)
    } finally {
      setCancelTarget(null)
    }
  }

  async function handlePauseResume() {
    if (!pauseTarget) return
    try {
      if (pauseTarget.action === "pause") await onPause?.(pauseTarget.id)
      else await onResume?.(pauseTarget.id)
    } finally {
      setPauseTarget(null)
    }
  }

  const activeFilterCount = [
    statusFilter !== "all",
    payFilter !== "all",
    deliveryFilter !== "all",
    planFilter !== "all",
  ].filter(Boolean).length

  function clearFilters() {
    setStatusFilter("all")
    setPayFilter("all")
    setDeliveryFilter("all")
    setPlanFilter("all")
  }

  const filters = (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-stretch">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, plan, or address"
            className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm font-medium text-neutral-900 outline-none placeholder:text-neutral-400"
          />
        </div>
        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
          className={`flex shrink-0 items-center gap-1.5 border-l px-3 text-sm font-semibold transition-colors duration-300 ease-in-out ${
            filtersOpen || activeFilterCount > 0
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <ListFilter size={16} strokeWidth={2.25} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="tabular-nums">{activeFilterCount}</span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ease-in-out ${filtersOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-neutral-200 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                  <CheckCircle2 size={13} strokeWidth={2.25} /> Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className={selectClass}
                >
                  <option value="all">All ({counts.status.all})</option>
                  <option value="active">Active ({counts.status.active})</option>
                  <option value="paused">Paused ({counts.status.paused})</option>
                  <option value="depleted">Depleted ({counts.status.depleted})</option>
                  <option value="cancelled">Cancelled ({counts.status.cancelled})</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                  <Wallet size={13} strokeWidth={2.25} /> Payment
                </span>
                <select
                  value={payFilter}
                  onChange={(e) => setPayFilter(e.target.value as typeof payFilter)}
                  className={selectClass}
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                  <Truck size={13} strokeWidth={2.25} /> Delivery
                </span>
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value as typeof deliveryFilter)}
                  className={selectClass}
                >
                  <option value="all">All</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="on-call">On-call</option>
                </select>
              </label>
              {plans.length > 1 && (
                <label className="block">
                  <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                    <Utensils size={13} strokeWidth={2.25} /> Plan
                  </span>
                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All plans</option>
                    {plans.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-semibold text-neutral-800 underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const listBody = loading && subscriptions.length === 0 ? (
    <p className="py-12 text-center text-sm text-[#475569]">Loading subscriptions...</p>
  ) : filtered.length === 0 ? (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-white py-20">
      <BadgeX size={40} className="mb-3 text-[#CBD5E1]" />
      <p className="text-sm font-medium text-[#475569]">No subscriptions match these filters</p>
    </div>
  ) : (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] md:px-6">
      {filtered.map((sub) => (
        <SubscriptionRow
          key={sub.id}
          sub={sub}
          onOpen={openDetails}
          onPause={onPause ? (id) => setPauseTarget({ id, action: "pause" }) : undefined}
          onResume={onResume ? (id) => setPauseTarget({ id, action: "resume" }) : undefined}
          onCancel={(id) => setCancelTarget(id)}
        />
      ))}
    </div>
  )

  const confirmDialog = (
    <>
      <ConfirmDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => handleCancel(cancelTarget!)}
        title="Cancel subscription"
        message="Are you sure you want to cancel this subscription? The customer will lose access to their meal plan."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep"
      />
      <ConfirmDialog
        open={pauseTarget !== null}
        onClose={() => setPauseTarget(null)}
        onConfirm={handlePauseResume}
        title={pauseTarget?.action === "resume" ? "Resume subscription" : "Pause subscription"}
        message={
          pauseTarget?.action === "resume"
            ? "Resume this subscription? The expiry date will be extended by the paused duration."
            : "Pause this subscription? No meals will be scheduled while paused, and the remaining entitlement is kept."
        }
        confirmLabel={pauseTarget?.action === "resume" ? "Resume" : "Pause"}
        cancelLabel="Keep"
      />
    </>
  )

  const included = (detail?.details?.includedMeals as string[] | undefined) ?? []
  const restrictionItems = restrictionDisplayItems(detail?.details).map((item) => ({
    ...item,
    label: ingNames[item.key] ?? item.label,
  }))

  const detailBody = detail ? (
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-900 p-4 text-white">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                <Utensils size={12} /> Plan
              </p>
              <p className="truncate text-sm font-bold">{planLabel(detail)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
                {(() => {
                  const life = lifecycleOf(detail)
                  const Icon = STATUS_ICON[life]
                  return <><Icon size={12} /> {life}</>
                })()}
                {detail.expires_at && (
                  <><CalendarClock size={12} /> {detail.expires_at.slice(0, 10)}</>
                )}
              </p>
            </div>
            {detail.remaining_meal_count !== undefined && detail.remaining_meal_count !== null && (
              <div className="shrink-0 text-right" title="Meals remaining">
                <p className="flex items-center justify-end gap-1.5 text-2xl font-bold leading-none tabular-nums">
                  <Utensils size={16} className="text-white/50" />
                  {detail.remaining_meal_count}
                </p>
                <p className="mt-1 text-[11px] text-white/60">meals left</p>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700"><User size={12} /> Name</span>
              <input value={editName} onChange={(e) => { setEditName(e.target.value); setSaveOk(false) }} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700"><Mail size={12} /> Email</span>
              <input type="email" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setSaveOk(false) }} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700"><Phone size={12} /> WhatsApp</span>
              <input value={editMobile} onChange={(e) => { setEditMobile(e.target.value); setSaveOk(false) }} placeholder="+9715XXXXXXXX" className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700"><MapPin size={12} /> Address</span>
              <textarea value={editAddress} onChange={(e) => { setEditAddress(e.target.value); setSaveOk(false) }} rows={3} className={fieldClass} />
            </label>
            {saveError && <p className="text-xs font-medium text-red-500">{saveError}</p>}
            {saveOk && <p className="text-xs font-medium text-neutral-600">Details saved.</p>}
            <Button onClick={handleSaveDetails} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save details"}
            </Button>
          </div>
          <div className="space-y-2 border-t border-neutral-100 pt-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Utensils size={14} /> Meals / day</span>
              <span className="font-semibold text-neutral-900">{mealsPerDay(detail)}</span>
            </div>
            {payments?.[detail.id] && (
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Wallet size={14} /> Payment</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-900">
                  {(() => {
                    const Icon = PAY_ICON[payStateOf(payments[detail.id].paid, payments[detail.id].total)]
                    return <Icon size={14} className="text-neutral-400" />
                  })()}
                  {paymentLabel(payments[detail.id].paid, payments[detail.id].total) ?? "—"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                {detail.details?.onCall ? <PhoneCall size={14} /> : <Truck size={14} />} Delivery
              </span>
              <span className="max-w-[60%] text-right font-semibold text-neutral-900">{deliveryLabel(detail.details)}</span>
            </div>
          </div>
          {payments?.[detail.id] && payments[detail.id].total !== null && payments[detail.id].paid < payments[detail.id].total! && (
            <div className="space-y-2 border-t border-neutral-100 pt-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                <CircleDollarSign size={12} /> Add payment
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Amount (AED)"
                  className={fieldClass}
                />
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={fieldClass}>
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
                className={fieldClass}
              />
              {payError && <p className="text-xs font-medium text-red-500">{payError}</p>}
              <Button onClick={handleRecordPayment} disabled={paying} className="w-full">
                {paying ? "Recording..." : "Add payment"}
              </Button>
            </div>
          )}
          {included.length > 0 && (
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                <Utensils size={12} />
                {included.length > 12 ? `Flexible · ${included.length} meals` : `Meals (${included.length})`}
              </p>
              {included.length <= 12 && (
                <ul className="mt-1 list-disc pl-5 text-neutral-800">
                  {included.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {restrictionItems.length > 0 && (
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                <ShieldAlert size={12} /> Restrictions
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {restrictionItems.map((item) => (
                  <span key={item.key} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{item.label}</span>
                ))}
              </div>
            </div>
          )}
          {typeof detail.details?.notes === "string" && detail.details.notes ? (
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                <StickyNote size={12} /> Notes
              </p>
              <p className="mt-1 text-neutral-800">{detail.details.notes as string}</p>
            </div>
          ) : null}
        </div>
  ) : null

  const detailFooter = detail && detail.status === "active" ? (
    <div className="flex flex-wrap gap-2">
      {!detail.paused_at && onPause && (
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setPauseTarget({ id: detail.id, action: "pause" })}
        >
          <Pause size={14} />
          Pause
        </Button>
      )}
      {detail.paused_at && onResume && (
        <Button
          className="flex-1"
          onClick={() => setPauseTarget({ id: detail.id, action: "resume" })}
        >
          <Play size={14} />
          Resume
        </Button>
      )}
      <Button
        variant="danger"
        className="flex-1"
        onClick={() => setCancelTarget(detail.id)}
      >
        <Ban size={14} />
        Cancel
      </Button>
    </div>
  ) : null

  const detailDialog = inline ? (
    detail ? (
      <DetailSheet
        title={displayName(detail)}
        titleId="subscription-detail-title"
        onClose={() => setDetailId(null)}
        footer={detailFooter}
      >
        {detailBody}
      </DetailSheet>
    ) : null
  ) : (
    <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail ? displayName(detail) : "Subscription"}>
      {detailBody ? <div className="max-h-[70vh] overflow-y-auto pr-1">{detailBody}</div> : null}
    </Modal>
  )

  const listFooter = (
    <p className="mt-4 flex items-center gap-2 text-xs text-[#475569]">
      <Users size={18} strokeWidth={1.75} />
      {filtered.length === subscriptions.length
        ? `${filtered.length} subscription${filtered.length === 1 ? "" : "s"}`
        : `${filtered.length} of ${subscriptions.length} subscriptions`}
    </p>
  )

  if (inline) {
    return (
      <>
        <div className="mb-4">{filters}</div>
        {listBody}
        {!(loading && subscriptions.length === 0) && filtered.length > 0 ? listFooter : null}
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
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Subscriptions</h2>
                <p className="mt-0.5 text-sm text-neutral-500">{subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-neutral-100 px-6 py-4">{filters}</div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{listBody}</div>
          </motion.div>
        </motion.div>
      )}
      {confirmDialog}
      {detailDialog}
    </AnimatePresence>
  )
}
