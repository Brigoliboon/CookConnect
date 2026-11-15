"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
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
  Inbox,
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
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { FOOD_RESTRICTIONS } from "@/constants"
import { Button } from "./Button"
import { ConfirmDialog } from "./ConfirmDialog"
import { Modal } from "./Modal"
import type { SubscriptionStatus } from "@/lib/supabase/models"

type Lifecycle = "active" | "paused" | "depleted" | "cancelled"
type PayState = "paid" | "partial" | "unpaid" | "unknown"

interface SubscriptionRow {
  id: string
  customer_name?: string
  customer_email?: string
  details: Record<string, unknown>
  status: SubscriptionStatus
  paused_at?: string | null
  remaining_meal_count?: number | null
  created_at: string
  expires_at?: string
  plan?: { id: string; name: string; validity_days: number } | null
}

function displayName(s: SubscriptionRow) {
  return s.customer_name ?? (s.details?.name as string | undefined) ?? "Guest"
}

function displayContact(s: SubscriptionRow) {
  return (
    (s.details?.mobile_number as string | undefined)
    ?? s.customer_email
    ?? (s.details?.email as string | undefined)
    ?? ""
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
  return letters || "?"
}

function lifecycleOf(s: SubscriptionRow): Lifecycle {
  if (s.status === "cancelled") return "cancelled"
  if (s.paused_at) return "paused"
  if (s.remaining_meal_count !== undefined && s.remaining_meal_count !== null && s.remaining_meal_count <= 0) {
    return "depleted"
  }
  return "active"
}

function payStateOf(paid: number | undefined, total: number | null | undefined): PayState {
  if (total === undefined || total === null) return "unknown"
  if ((paid ?? 0) <= 0) return "unpaid"
  if ((paid ?? 0) < total) return "partial"
  return "paid"
}

function planLabel(s: SubscriptionRow) {
  return String(s.details?.planName ?? s.plan?.name ?? s.details?.planId ?? "—")
}

function mealsPerDay(s: SubscriptionRow) {
  const value = s.details?.mealsPerDay
  return typeof value === "number" ? value : 1
}

function statusClass(life: Lifecycle) {
  if (life === "paused") return "bg-neutral-200 text-neutral-800"
  if (life === "depleted") return "bg-neutral-200 text-neutral-700"
  if (life === "cancelled") return "bg-neutral-100 text-neutral-700"
  return "bg-neutral-100 text-neutral-800"
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

function Meta({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <span title={title} className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-neutral-700">
      <Icon size={14} strokeWidth={2.25} className="shrink-0 text-neutral-800" />
      <span className="truncate">{children}</span>
    </span>
  )
}

interface SubscriptionDialogProps {
  open?: boolean
  onClose?: () => void
  subscriptions: SubscriptionRow[]
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
  const [statusFilter, setStatusFilter] = useState<"all" | Lifecycle>("all")
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

  function openDetails(sub: SubscriptionRow) {
    const d = sub.details ?? {}
    setEditName(String(d.name ?? displayName(sub)))
    setEditEmail(String(d.email ?? sub.customer_email ?? ""))
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

  function restrictionLabel(id: string): string | null {
    const staticLabel = FOOD_RESTRICTIONS.find((f) => f.value === id)?.label
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

  const listBody = loading ? (
    <div className="divide-y divide-neutral-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-neutral-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-40 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-64 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  ) : filtered.length === 0 ? (
    <div className="py-16 text-center">
      <BadgeX size={28} className="mx-auto mb-3 text-neutral-300" />
      <p className="text-sm font-medium text-neutral-500">No subscriptions match these filters</p>
    </div>
  ) : (
    <div className="divide-y divide-neutral-100">
      {filtered.map((sub) => {
        const life = lifecycleOf(sub)
        const name = displayName(sub)
        const StatusIcon = STATUS_ICON[life]
        const payment = payments?.[sub.id]
        const pay = payStateOf(payment?.paid, payment?.total)
        const PayIcon = PAY_ICON[pay]
        const remaining = sub.remaining_meal_count
        const onCall = Boolean(sub.details?.onCall)
        const contact = displayContact(sub)
        const payShort = pay === "paid" ? "Paid" : pay === "partial" ? "Partial" : pay === "unpaid" ? "Unpaid" : null

        return (
          <div
            key={sub.id}
            onClick={() => openDetails(sub)}
            className={`-mx-6 cursor-pointer px-4 py-4 sm:px-6 ${
              life === "cancelled" ? "opacity-60" : "hover:bg-neutral-50/80"
            }`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                {initials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <p className="truncate text-base font-semibold leading-snug text-neutral-900">{name}</p>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      title={life}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(life)}`}
                    >
                      <StatusIcon size={13} strokeWidth={2.25} />
                      {life}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-neutral-900" title="Meals remaining">
                      <Utensils size={14} strokeWidth={2.25} />
                      {remaining === undefined || remaining === null ? "—" : remaining}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <Meta icon={Utensils} title="Plan">{planLabel(sub)}</Meta>
                  {contact && <Meta icon={Phone} title="Contact">{contact}</Meta>}
                  {payShort && <Meta icon={PayIcon} title="Payment">{payShort}</Meta>}
                  {onCall && <Meta icon={PhoneCall} title="Delivery">On-call</Meta>}
                </div>
              </div>
              {sub.status === "active" && (
                <div className="flex shrink-0 items-center gap-2 self-center" onClick={(e) => e.stopPropagation()}>
                  {!sub.paused_at && onPause && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPauseTarget({ id: sub.id, action: "pause" })}
                      aria-label="Pause"
                      title="Pause"
                    >
                      <Pause size={14} />
                      <span className="hidden sm:inline">Pause</span>
                    </Button>
                  )}
                  {sub.paused_at && onResume && (
                    <Button
                      size="sm"
                      onClick={() => setPauseTarget({ id: sub.id, action: "resume" })}
                      aria-label="Resume"
                      title="Resume"
                    >
                      <Play size={14} />
                      <span className="hidden sm:inline">Resume</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setCancelTarget(sub.id)}
                    aria-label="Cancel"
                    title="Cancel"
                  >
                    <Ban size={14} />
                    <span className="hidden sm:inline">Cancel</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}
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
  const restrictions = (detail?.details?.restrictions as string[] | undefined) ?? []

  const detailDialog = (
    <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail ? displayName(detail) : "Subscription"}>
      {detail && (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 text-sm">
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
          {restrictions.length > 0 && (
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                <ShieldAlert size={12} /> Restrictions
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {restrictions.map((r) => {
                  const label = restrictionLabel(r)
                  if (!label) return null
                  return (
                    <span key={r} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{label}</span>
                  )
                })}
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
      )}
    </Modal>
  )

  const stats = (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Active", value: counts.status.active, icon: CheckCircle2 },
        { label: "Paused", value: counts.status.paused, icon: Pause },
        { label: "Unpaid", value: counts.pay.unpaid, icon: CircleAlert },
      ].map((s) => (
        <div key={s.label} className="rounded-2xl border border-neutral-200/60 bg-white/80 p-4 text-center backdrop-blur-sm">
          <p className="text-2xl font-bold tabular-nums text-neutral-900">{s.value}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-700">
            <s.icon size={12} />
            {s.label}
          </p>
        </div>
      ))}
    </div>
  )

  if (inline) {
    return (
      <>
        {stats}
        <div className="-mx-6 bg-white">
          <div className="flex flex-wrap items-end justify-between gap-3 px-6 py-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                <Inbox size={12} /> Directory
              </p>
              <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-neutral-900">Subscriptions</h2>
              <p className="mt-1 text-sm text-neutral-500">
                <span className="font-semibold text-neutral-900">{filtered.length}</span>
                {filtered.length === 1 ? " match" : " matches"}
                <span className="mx-1.5 text-neutral-300">·</span>
                <span className="font-semibold text-neutral-900">{subscriptions.length}</span> total
              </p>
            </div>
          </div>
          <div className="px-6 pb-4">{filters}</div>
          <div className="px-6 pb-6">{listBody}</div>
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
