"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button, Modal, Select, SubscriptionDialog, CsvImportDialog } from "@/components/ui"
import type { CsvImportPreviewRow } from "@/components/ui/CsvImportDialog"
import { PAYMENT_METHODS, SUBSCRIPTION_PLANS } from "@/constants"
import { ChevronDown, Copy, FileDown, FileSpreadsheet, Link2, Plus, X } from "lucide-react"
import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"
import { downloadCsv, parseCsv } from "@/lib/meals/csv"
import {
  parseSubscriptionCsvRow,
  SUBSCRIPTION_CSV_HEADERS,
  SUBSCRIPTION_CSV_SHORT_LABELS,
} from "@/lib/subscription/csv"

interface SubscriptionRow {
  id: string
  customer_name: string
  customer_email: string
  details: Record<string, unknown>
  status: "active" | "cancelled"
  paused_at?: string | null
  remaining_meal_count?: number | null
  created_at: string
}

interface InquiryRow {
  id: string
  plan_id: string
  name: string
  email: string | null
  mobile_number: string
  address: string
  details: {
    mode?: string
    restrictions?: string[]
    restrictionNames?: Record<string, string>
    mealsPerDay?: number
    breakfast?: boolean
    includedMeals?: string[]
    days?: string[]
    slots?: string[]
    slot?: string | null
    time?: string | null
    onCall?: boolean
    invite?: {
      verified?: boolean
      expiresAt?: string
      agreedPriceCents?: number
      basePriceCents?: number
      concession?: string
      currency?: string
    }
  }
  created_at: string
}

function agreedPriceLabel(details: InquiryRow["details"] | undefined): string | null {
  const cents = details?.invite?.agreedPriceCents
  if (typeof cents !== "number") return null
  return `${details?.invite?.currency ?? "AED"} ${(cents / 100).toFixed(2)}`
}

export default function EmployeeSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [inquiryId, setInquiryId] = useState<string | null>(null)
  const [ingNames, setIngNames] = useState<Record<string, string>>({})
  const [mealNames, setMealNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [approving, setApproving] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [approveError, setApproveError] = useState("")
  const [payTotal, setPayTotal] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("bank-transfer")
  const [payRef, setPayRef] = useState("")
  const [payMap, setPayMap] = useState<Record<string, { paid: number; total: number | null }>>({})
  const [showInvite, setShowInvite] = useState(false)
  const [invitePlan, setInvitePlan] = useState(SUBSCRIPTION_PLANS[0].id)
  const [inviteDays, setInviteDays] = useState("14")
  const [invitePrice, setInvitePrice] = useState("")
  const [inviteMealsPerDay, setInviteMealsPerDay] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [inviteError, setInviteError] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [csvMenuOpen, setCsvMenuOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
  const [importFileName, setImportFileName] = useState("")
  const [importPreview, setImportPreview] = useState<CsvImportPreviewRow[]>([])
  const [pendingImport, setPendingImport] = useState<{ line: number; values: Record<string, string> }[]>([])
  const [importResult, setImportResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null)
  const csvFileRef = useRef<HTMLInputElement>(null)

  async function handleGenerateInvite() {
    setInviteLoading(true)
    setInviteError("")
    setInviteLink("")
    setInviteCopied(false)

    const priceCents = invitePrice.trim() ? Math.round(Number(invitePrice) * 100) : undefined
    if (priceCents !== undefined && (!Number.isFinite(priceCents) || priceCents <= 0)) {
      setInviteError("Price must be a positive amount.")
      setInviteLoading(false)
      return
    }
    const mealsPerDay = inviteMealsPerDay.trim() ? Number(inviteMealsPerDay) : undefined
    if (mealsPerDay !== undefined && (!Number.isInteger(mealsPerDay) || mealsPerDay < 1 || mealsPerDay > 5)) {
      setInviteError("Meals per day must be a whole number between 1 and 5.")
      setInviteLoading(false)
      return
    }

    try {
      const res = await fetch("/api/subscription-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: invitePlan,
          expiresInDays: Number(inviteDays),
          ...(priceCents !== undefined ? { price_cents: priceCents } : {}),
          ...(mealsPerDay !== undefined ? { meals_per_day: mealsPerDay } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate invite link")
      setInviteLink(data.url as string)
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to generate invite link")
    } finally {
      setInviteLoading(false)
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setInviteCopied(true)
    } catch {
      setInviteError("Could not copy. Select the link manually.")
    }
  }

  async function fetchSubscriptions() {
    try {
      const res = await fetch("/api/subscriptions")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch subscriptions")
      setSubscriptions(data)
      refreshPayMap()
    } catch (e) {
      console.error("[SUBSCRIPTIONS] Fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [subsRes, recipeRes, inqRes] = await Promise.all([
          fetch("/api/subscriptions"),
          fetch("/api/recipe?sort=name"),
          fetch("/api/subscription-inquiries"),
        ])

        if (subsRes.ok) {
          const data = await subsRes.json()
          setSubscriptions(data)
        }
        if (recipeRes.ok) {
          const { data } = await recipeRes.json()
          const active = (data as { id: string; name: string; category: string | null; is_active: boolean }[]).filter(
            (r) => r.is_active !== false,
          )
          setMealNames(Object.fromEntries(active.map((r) => [r.id, r.name])))
        }
        if (inqRes.ok) {
          const inqs = (await inqRes.json()) as InquiryRow[]
          setInquiries(inqs)
          const ingIds = [...new Set(inqs.flatMap((q) => q.details?.restrictions ?? []))]
          if (ingIds.length > 0) {
            fetch(`/api/ingredients?ids=${ingIds.join(",")}&limit=200`)
              .then((r) => r.json())
              .then((d) => setIngNames(Object.fromEntries(((d.data ?? []) as { id: string; name: string }[]).map((i) => [i.id, i.name]))))
              .catch(() => {})
          }
        }
      } catch (e) {
        console.error("[SUBSCRIPTIONS] Initial load error:", e)
      } finally {
        setLoading(false)
        refreshPayMap()
      }
    }

    void load()
  }, [])

  function resetForm() {
    setPayTotal("")
    setPayAmount("")
    setPayRef("")
  }

  function recipesByNameMap() {
    const map = new Map<string, string>()
    for (const [id, name] of Object.entries(mealNames)) {
      const key = name.trim().toLowerCase()
      if (key && !map.has(key)) map.set(key, id)
    }
    return map
  }

  function handleDownloadTemplate() {
    setCsvMenuOpen(false)
    downloadCsv("subscriptions-template.csv", [...SUBSCRIPTION_CSV_HEADERS], [])
  }

  async function handleImportFile(file: File) {
    setCsvMenuOpen(false)
    setImportResult(null)
    try {
      let recipesByName = recipesByNameMap()
      if (recipesByName.size === 0) {
        const recipeRes = await fetch("/api/recipe?sort=name")
        if (recipeRes.ok) {
          const { data } = await recipeRes.json()
          const active = (data as { id: string; name: string; is_active: boolean }[]).filter((r) => r.is_active !== false)
          setMealNames(Object.fromEntries(active.map((r) => [r.id, r.name])))
          recipesByName = new Map<string, string>()
          for (const recipe of active) {
            const key = recipe.name.trim().toLowerCase()
            if (key && !recipesByName.has(key)) recipesByName.set(key, recipe.id)
          }
        }
      }

      const text = await file.text()
      const parsed = parseCsv(text)
      if (parsed.length < 2) throw new Error("CSV has no data rows")
      const headers = parsed[0].map((h) => h.trim().toLowerCase())
      if (!headers.includes("name") || !headers.includes("plan") || !headers.includes("mobile_number") || !headers.includes("address")) {
        throw new Error('CSV must have "name", "mobile_number", "address", and "plan" columns')
      }
      const colIndex: Record<string, number> = {}
      for (const h of SUBSCRIPTION_CSV_HEADERS) colIndex[h] = headers.indexOf(h)
      const preview: CsvImportPreviewRow[] = []
      const pending: { line: number; values: Record<string, string> }[] = []
      for (let i = 1; i < parsed.length; i++) {
        const cells = parsed[i]
        const col: Record<string, string> = {}
        for (const h of SUBSCRIPTION_CSV_HEADERS) {
          const idx = colIndex[h]
          col[h] = idx === -1 ? "" : (cells[idx] ?? "")
        }
        const lineNo = i + 1
        try {
          parseSubscriptionCsvRow(col, recipesByName.size > 0 ? { recipesByName } : {})
          pending.push({ line: lineNo, values: col })
          preview.push({ lineNo, values: col, status: "new" })
        } catch (e) {
          preview.push({
            lineNo,
            values: col,
            status: "error",
            error: e instanceof Error ? e.message : "Invalid row",
          })
        }
      }
      setImportFileName(file.name)
      setImportPreview(preview)
      setPendingImport(pending)
      setImportPreviewOpen(true)
    } catch (e) {
      setImportResult({ created: 0, failed: 1, errors: [e instanceof Error ? e.message : "Import failed"] })
    }
  }

  async function handleConfirmImport() {
    if (pendingImport.length === 0 || importing) return
    setImporting(true)
    try {
      const res = await fetch("/api/subscriptions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pendingImport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to import subscriptions")
      const errors = Array.isArray(data.errors)
        ? (data.errors as { line: number; message: string }[]).map((err) => `line ${err.line}: ${err.message}`)
        : []
      setImportResult({
        created: Number(data.created) || 0,
        failed: Number(data.failed) || errors.length,
        errors: errors.slice(0, 8),
      })
      setImportPreviewOpen(false)
      setPendingImport([])
      await fetchSubscriptions()
      await refreshPayMap()
    } catch (e) {
      setImportResult({ created: 0, failed: pendingImport.length, errors: [e instanceof Error ? e.message : "Import failed"] })
    } finally {
      setImporting(false)
    }
  }

  async function handleCancel(id: string) {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to cancel")
      }
      await fetchSubscriptions()
    } catch (e) {
      console.error("[SUBSCRIPTIONS] Cancel error:", e)
    }
  }

  async function handlePauseResume(id: string, action: "pause" | "resume") {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? `Failed to ${action}`)
      }
      await fetchSubscriptions()
    } catch (e) {
      console.error(`[SUBSCRIPTIONS] ${action} error:`, e)
    }
  }

  async function handleApproveInquiry() {
    if (!selectedInquiry) return
    const total = Math.round(Number(payTotal) * 100)
    const amount = Math.round(Number(payAmount || 0) * 100)
    if (!Number.isFinite(total) || total < 0) {
      setApproveError("Enter the total price.")
      return
    }
    if (!Number.isFinite(amount) || amount < 0 || amount > total) {
      setApproveError("Amount paying must be between 0 and total.")
      return
    }
    setApproving(true)
    setApproveError("")
    try {
      const res = await fetch(`/api/subscription-inquiries/${selectedInquiry.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_cents: total, amount_cents: amount, method: payMethod, reference: payRef || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to approve")
      setInquiries((prev) => prev.filter((q) => q.id !== selectedInquiry.id))
      setInquiryId(null)
      setPayTotal("")
      setPayAmount("")
      setPayRef("")
      fetchSubscriptions()
      refreshPayMap()
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Failed to approve")
    } finally {
      setApproving(false)
    }
  }

  async function handleDeclineInquiry() {
    if (!selectedInquiry) return
    if (!confirmDecline) {
      setConfirmDecline(true)
      return
    }
    setDeclining(true)
    setApproveError("")
    try {
      const res = await fetch(`/api/subscription-inquiries/${selectedInquiry.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to decline")
      setInquiries((prev) => prev.filter((q) => q.id !== selectedInquiry.id))
      setInquiryId(null)
      setConfirmDecline(false)
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Failed to decline")
    } finally {
      setDeclining(false)
    }
  }

  async function refreshPayMap() {
    try {
      const [payRes, subsRes] = await Promise.all([fetch("/api/subscription-payments"), fetch("/api/subscriptions")])
      if (!payRes.ok) return
      const { data } = await payRes.json()
      const paidBy: Record<string, number> = {}
      for (const p of (data ?? []) as { subscription_id: string; amount_cents: number }[]) {
        paidBy[p.subscription_id] = (paidBy[p.subscription_id] ?? 0) + Number(p.amount_cents)
      }
      let totals: Record<string, number | null> = {}
      if (subsRes.ok) {
        const subs = (await subsRes.json()) as { id: string; details: Record<string, unknown> }[]
        totals = Object.fromEntries(subs.map((s) => [s.id, (s.details?.total_cents as number | undefined) ?? null]))
      }
      const map: Record<string, { paid: number; total: number | null }> = {}
      for (const id of new Set([...Object.keys(paidBy), ...Object.keys(totals)])) {
        map[id] = { paid: paidBy[id] ?? 0, total: totals[id] ?? null }
      }
      setPayMap(map)
    } catch {}
  }

  const selectedInquiry = inquiryId ? inquiries.find((q) => q.id === inquiryId) ?? null : null
  const selectedSlots: string[] = selectedInquiry?.details?.slots
    ?? (selectedInquiry?.details?.slot ? [selectedInquiry.details.slot as string] : [])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-nunito text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
            Employee
          </p>
          <h1 className="font-playfair mt-2 text-3xl font-medium text-neutral-900 sm:text-4xl">Subscriptions</h1>
          <p className="font-nunito mt-2 text-sm text-neutral-500">Review inquiries or manage existing subscriptions.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <Button variant="outline" className="gap-1.5" onClick={() => setCsvMenuOpen((open) => !open)} disabled={importing}>
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">{importing ? "Importing..." : "CSV"}</span>
              <ChevronDown size={14} />
            </Button>
            {csvMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCsvMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                  >
                    <FileDown size={18} className="mt-0.5 shrink-0 text-neutral-500" />
                    <span>
                      <span className="block text-sm font-semibold text-neutral-900">Download CSV template</span>
                      <span className="block text-xs text-neutral-500">Blank file with the subscription columns</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCsvMenuOpen(false); csvFileRef.current?.click() }}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                  >
                    <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-neutral-500" />
                    <span>
                      <span className="block text-sm font-semibold text-neutral-900">Import CSV</span>
                      <span className="block text-xs text-neutral-500">Create subscriptions from a spreadsheet</span>
                    </span>
                  </button>
                </div>
              </>
            )}
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (file) void handleImportFile(file)
              }}
            />
          </div>
          <Button variant="outline" onClick={() => { setShowInvite(true); setInviteLink(""); setInvitePrice(""); setInviteMealsPerDay(""); setInviteError(""); setInviteCopied(false) }}>
            <Link2 size={16} />
            Invite link
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus size={16} />
            New Subscription
          </Button>
        </div>
      </div>

      {importResult && !importing && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${importResult.failed > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-neutral-200 bg-neutral-50 text-neutral-800"}`}>
          <p className="flex-1">
            Imported {importResult.created} subscription{importResult.created === 1 ? "" : "s"}
            {importResult.failed > 0 && `, ${importResult.failed} failed`}
            {importResult.errors.map((err, i) => (
              <span key={i} className="mt-1 block text-xs opacity-80">{err}</span>
            ))}
          </p>
          <button onClick={() => setImportResult(null)} className="shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5" title="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div>
        <h2 className="font-playfair mb-3 text-xl font-medium text-neutral-900">Inquiries ({inquiries.length})</h2>
        {inquiries.length === 0 ? (
          <p className="font-nunito border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
            No subscription inquiries yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inquiries.map((q) => (
              <div key={q.id} className="border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-nunito font-semibold text-neutral-900">{q.name}</p>
                  <div className="flex items-center gap-1.5">
                    {q.details?.breakfast && (
                      <span className="bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        Breakfast
                      </span>
                    )}
                    <span className="bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-500">
                      {q.details?.mode ?? "normal"}
                    </span>
                  </div>
                </div>
                <p className="font-nunito mt-1 text-xs text-neutral-500">{q.plan_id} · {q.mobile_number}</p>
                <p className="font-nunito mt-0.5 line-clamp-1 text-xs text-neutral-400">{q.address}</p>
                <button
                  onClick={() => {
                    setInquiryId(q.id)
                    const cents = q.details?.invite?.agreedPriceCents
                    setPayTotal(typeof cents === "number" ? (cents / 100).toFixed(2) : "")
                    setPayAmount("")
                    setPayRef("")
                  }}
                  className="font-nunito mt-3 w-full border border-neutral-900 bg-neutral-900 py-2 text-xs font-semibold text-white transition-all hover:bg-neutral-800"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selectedInquiry} onClose={() => { setInquiryId(null); setConfirmDecline(false) }} title={selectedInquiry ? `Inquiry — ${selectedInquiry.name}` : "Inquiry"}>
        {selectedInquiry && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Plan</span><span className="font-semibold">{selectedInquiry.plan_id}</span></div>
            {agreedPriceLabel(selectedInquiry.details) && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Agreed price</span>
                <span className="font-semibold">{agreedPriceLabel(selectedInquiry.details)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-neutral-500">Mobile</span><span className="font-semibold">{selectedInquiry.mobile_number}</span></div>
            {selectedInquiry.email && <div className="flex justify-between"><span className="text-neutral-500">Email</span><span className="font-semibold">{selectedInquiry.email}</span></div>}
            <div><p className="text-neutral-500">Address</p><p className="font-medium">{selectedInquiry.address}</p></div>
            <div className="flex justify-between"><span className="text-neutral-500">Mode</span><span className="font-semibold capitalize">{selectedInquiry.details?.mode}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Meals per day</span><span className="font-semibold">{selectedInquiry.details?.mealsPerDay ?? 1}</span></div>
            {selectedInquiry.details?.breakfast && (
              <div className="flex justify-between"><span className="text-neutral-500">Breakfast</span><span className="font-semibold">Included (extra)</span></div>
            )}
            {(selectedInquiry.details?.restrictions ?? []).length > 0 && (
              <div>
                <p className="text-neutral-500">Restrictions</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(selectedInquiry.details.restrictions ?? []).map((id) => {
                    const label = selectedInquiry.details.restrictionNames?.[id] ?? ingNames[id]
                    if (!label) return null
                    return (
                      <span key={id} className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-600">{label}</span>
                    )
                  })}
                </div>
              </div>
            )}
            {(selectedInquiry.details?.includedMeals ?? []).length > 0 && (
              <div>
                <p className="text-neutral-500">Meals ({selectedInquiry.details.includedMeals?.length})</p>
                <ul className="mt-1 list-disc pl-5 text-neutral-800">
                  {(selectedInquiry.details.includedMeals ?? []).map((id) => (
                    <li key={id}>{mealNames[id] ?? id}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-100 pt-2">
              <span className="text-neutral-500">Delivery</span>
              <span className="font-semibold">
                {selectedInquiry.details?.onCall
                  ? "On-call only"
                  : `${(selectedInquiry.details?.days ?? []).join(", ")} · ${selectedSlots.join(", ")}${selectedInquiry.details?.time ? ` ${selectedInquiry.details.time}` : ""}`}
              </span>
            </div>
            {approveError && <p className="text-xs font-medium text-red-500">{approveError}</p>}
            <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Total price (AED)*</label>
                <input type="number" min={0} step={0.5} value={payTotal} onChange={(e) => setPayTotal(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900" placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Paying now (AED)*</label>
                <input type="number" min={0} step={0.5} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900" placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Method</label>
                <Select options={PAYMENT_METHODS} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Reference</label>
                <input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900" placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="danger" onClick={handleDeclineInquiry} disabled={declining || approving}>
                {declining ? "Declining..." : confirmDecline ? "Confirm decline?" : "Decline"}
              </Button>
              <Button onClick={handleApproveInquiry} disabled={approving || declining}>
                {approving ? "Approving..." : "Approve subscription"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CsvImportDialog
        open={importPreviewOpen}
        fileName={importFileName}
        rows={importPreview}
        importing={importing}
        headers={[...SUBSCRIPTION_CSV_HEADERS]}
        shortLabels={SUBSCRIPTION_CSV_SHORT_LABELS}
        tone="neutral"
        onClose={() => { if (!importing) { setImportPreviewOpen(false); setPendingImport([]) } }}
        onConfirm={handleConfirmImport}
      />

      <SubscriptionDialog
        inline
        subscriptions={subscriptions}
        loading={loading}
        onCancel={handleCancel}
        onPause={(id) => handlePauseResume(id, "pause")}
        onResume={(id) => handlePauseResume(id, "resume")}
        payments={payMap}
        onPaymentsChanged={refreshPayMap}
        onUpdated={fetchSubscriptions}
      />

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Create invite link"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            Send this link to a customer. They will complete the progressive onboarding form for the selected plan.
          </p>
          <Select
            label="Plan"
            options={SUBSCRIPTION_PLANS.map((plan) => ({ label: plan.name, value: plan.id }))}
            value={invitePlan}
            onChange={(e) => setInvitePlan(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Price (AED, optional)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={invitePrice}
              onChange={(e) => setInvitePrice(e.target.value)}
              placeholder="Leave blank for no fixed price"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Meals per day (optional)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={inviteMealsPerDay}
              onChange={(e) => setInviteMealsPerDay(e.target.value)}
              placeholder="Leave blank for the form default"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Valid for (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={inviteDays}
              onChange={(e) => setInviteDays(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
          {inviteLink && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Share this link</label>
              <textarea
                readOnly
                value={inviteLink}
                rows={3}
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600"
              />
              <Button variant="outline" onClick={copyInviteLink} className="w-full">
                <Copy size={15} />
                {inviteCopied ? "Copied" : "Copy link"}
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowInvite(false)} className="flex-1">
              Close
            </Button>
            <Button onClick={handleGenerateInvite} disabled={inviteLoading} className="flex-1">
              {inviteLoading ? "Generating..." : inviteLink ? "Regenerate" : "Generate link"}
            </Button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="my-8 w-full max-w-3xl rounded-2xl bg-neutral-50 p-4 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-playfair text-xl font-medium text-neutral-900">New Subscription</h2>
                  <p className="font-nunito mt-0.5 text-xs text-neutral-500">Same form as the public page, created directly.</p>
                </div>
                <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700">
                  <X size={18} />
                </button>
              </div>
              <SubscriptionForm
                staffMode
                onCreated={() => {
                  setShowForm(false)
                  fetchSubscriptions()
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
