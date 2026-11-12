"use client"

import { useState, type FormEvent } from "react"
import { Button, Select } from "@/components/ui"
import { DELIVERY_DAYS, PAYMENT_METHODS, SUBSCRIPTION_PLANS } from "@/constants/subscriptions"

const SLOTS: { label: string; value: "morning" | "noon" | "evening" }[] = [
  { label: "Morning", value: "morning" },
  { label: "Noon", value: "noon" },
  { label: "Evening", value: "evening" },
]

function sanitizeUaLocal(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("971")) digits = digits.slice(3)
  else if (digits.startsWith("0971")) digits = digits.slice(4)
  else if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(0, 9)
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "restriction"
}

function splitNames(value: string): string[] {
  return value
    .split(/[;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

const fieldClass =
  "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"

export function StaffSubscriptionForm({ onCreated }: { onCreated?: () => void }) {
  const [planId, setPlanId] = useState(SUBSCRIPTION_PLANS[0].id)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [address, setAddress] = useState("")
  const [mode, setMode] = useState<"normal" | "flexible">("normal")
  const [mealsPerDay, setMealsPerDay] = useState("1")
  const [breakfast, setBreakfast] = useState(false)
  const [onCall, setOnCall] = useState(true)
  const [days, setDays] = useState<string[]>([])
  const [slots, setSlots] = useState<("morning" | "noon" | "evening")[]>(["morning"])
  const [restrictionsText, setRestrictionsText] = useState("")
  const [totalAed, setTotalAed] = useState("")
  const [paidAed, setPaidAed] = useState("")
  const [payMethod, setPayMethod] = useState("bank-transfer")
  const [payRef, setPayRef] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId) ?? SUBSCRIPTION_PLANS[0]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedAddress = address.trim()
    const local = sanitizeUaLocal(mobile)
    const trimmedEmail = email.trim()
    const meals = Number(mealsPerDay)
    const totalCents = totalAed.trim() ? Math.round(Number(totalAed) * 100) : undefined
    const paidCents = paidAed.trim() ? Math.round(Number(paidAed) * 100) : 0

    if (!trimmedName || !trimmedAddress) {
      setError("Name and address are required.")
      return
    }
    if (local.length !== 9) {
      setError("Enter a UAE WhatsApp number (9 digits after +971).")
      return
    }
    if (trimmedEmail && !trimmedEmail.includes("@")) {
      setError("Email is invalid.")
      return
    }
    if (!Number.isInteger(meals) || meals < 1 || meals > 5) {
      setError("Meals per day must be a whole number between 1 and 5.")
      return
    }
    if (!onCall && days.length === 0) {
      setError("Select delivery days or choose on-call.")
      return
    }
    if (!onCall && slots.length === 0) {
      setError("Select at least one delivery slot.")
      return
    }
    if (totalCents !== undefined && (!Number.isFinite(totalCents) || totalCents < 0)) {
      setError("Total price must be 0 or greater.")
      return
    }
    if (!Number.isFinite(paidCents) || paidCents < 0) {
      setError("Amount paid must be 0 or greater.")
      return
    }
    if (paidCents > 0 && totalCents === undefined) {
      setError("Enter the total price when recording a payment.")
      return
    }
    if (totalCents !== undefined && paidCents > totalCents) {
      setError("Amount paid cannot exceed the total price.")
      return
    }

    const restrictionNames: Record<string, string> = {}
    const restrictions: string[] = []
    for (const label of splitNames(restrictionsText)) {
      let key = `csv:${slugify(label)}`
      let n = 2
      while (key in restrictionNames) key = `csv:${slugify(label)}-${n++}`
      restrictions.push(key)
      restrictionNames[key] = label
    }

    let paymentStatus: "pending" | "partial" | "paid" = "pending"
    if (totalCents !== undefined) {
      if (paidCents <= 0) paymentStatus = "pending"
      else if (paidCents < totalCents) paymentStatus = "partial"
      else paymentStatus = "paid"
    }

    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          details: {
            source: "staff",
            planId: plan.id,
            planName: plan.name,
            planType: plan.type,
            durationDays: plan.durationDays,
            name: trimmedName,
            email: trimmedEmail || null,
            mobile_number: `+971${local}`,
            address: trimmedAddress,
            location: null,
            mode,
            restrictions,
            restrictionNames,
            mealsPerDay: meals,
            breakfast,
            includedMeals: [],
            days: onCall ? [] : days,
            slots: onCall ? [] : slots,
            onCall,
            paymentStatus,
            ...(totalCents !== undefined ? { total_cents: totalCents } : {}),
          },
          ...(totalCents !== undefined ? { total_cents: totalCents } : {}),
          ...(paidCents > 0
            ? { amount_cents: paidCents, method: payMethod, reference: payRef.trim() || null }
            : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create subscription")
      onCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subscription")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Select
        label="Plan"
        options={SUBSCRIPTION_PLANS.map((item) => ({ label: `${item.name} (${item.durationDays} days)`, value: item.id }))}
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">WhatsApp *</span>
          <div className="flex gap-1.5">
            <span className="flex shrink-0 items-center rounded-xl border border-neutral-200 bg-neutral-50 px-2 text-xs font-semibold text-neutral-600">+971</span>
            <input
              value={mobile}
              onChange={(e) => setMobile(sanitizeUaLocal(e.target.value))}
              inputMode="numeric"
              maxLength={9}
              placeholder="5XXXXXXXX"
              className={fieldClass}
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Address *</span>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={fieldClass} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Mode"
          options={[
            { label: "Normal", value: "normal" },
            { label: "Flexible", value: "flexible" },
          ]}
          value={mode}
          onChange={(e) => setMode(e.target.value as "normal" | "flexible")}
        />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-900">Meals per day</span>
          <input
            type="number"
            min={1}
            max={5}
            value={mealsPerDay}
            onChange={(e) => setMealsPerDay(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-medium text-neutral-800">
          <input type="checkbox" checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} />
          Breakfast extra
        </label>
      </div>

      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-800">
          <input
            type="checkbox"
            checked={onCall}
            onChange={(e) => {
              setOnCall(e.target.checked)
              if (e.target.checked) {
                setDays([])
                setSlots([])
              } else if (slots.length === 0) {
                setSlots(["morning"])
              }
            }}
          />
          On-call delivery
        </label>
        {!onCall && (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-neutral-500">Days</p>
              <div className="flex flex-wrap gap-1.5">
                {DELIVERY_DAYS.map((day) => {
                  const active = days.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => setDays(toggleValue(days, day.value))}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-neutral-500">Slots</p>
              <div className="flex flex-wrap gap-1.5">
                {SLOTS.map((slot) => {
                  const active = slots.includes(slot.value)
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setSlots(toggleValue(slots, slot.value))}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-neutral-500">Restrictions (comma-separated)</span>
        <input
          value={restrictionsText}
          onChange={(e) => setRestrictionsText(e.target.value)}
          placeholder="Peanuts, dairy"
          className={fieldClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Total (AED)</span>
          <input type="number" min={0} step={0.5} value={totalAed} onChange={(e) => setTotalAed(e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Paid now (AED)</span>
          <input type="number" min={0} step={0.5} value={paidAed} onChange={(e) => setPaidAed(e.target.value)} className={fieldClass} />
        </label>
        <Select label="Method" options={PAYMENT_METHODS} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-900">Reference</span>
          <input value={payRef} onChange={(e) => setPayRef(e.target.value)} className={fieldClass} />
        </label>
      </div>

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Creating..." : "Create subscription"}
      </Button>
    </form>
  )
}
