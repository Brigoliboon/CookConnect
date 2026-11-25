"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button, Modal, Select, SubscriptionDialog, CsvImportDialog } from "@/components/ui"
import type { CsvImportPreviewRow } from "@/components/ui/CsvImportDialog"
import { PAYMENT_METHODS, SUBSCRIPTION_PLANS } from "@/constants"
import {
  Ban,
  Bell,
  CakeSlice,
  CheckCircle2,
  ChevronRight,
  Coffee,
  CupSoda,
  Copy,
  Ellipsis,
  FileDown,
  FileSpreadsheet,
  Layers,
  Link2,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Truck,
  Users,
  Utensils,
  Wallet,
  X,
} from "lucide-react"
import { DetailSheet } from "@/components/subscriptions/DetailSheet"
import { avatarTone, initials, lifecycleOf } from "@/components/subscriptions/helpers"
import { StaffSubscriptionForm } from "@/components/subscription/StaffSubscriptionForm"
import { downloadCsv, parseCsv } from "@/lib/meals/csv"
import {
  parseSubscriptionCsvRow,
  SUBSCRIPTION_CSV_HEADERS,
  SUBSCRIPTION_CSV_SHORT_LABELS,
} from "@/lib/subscription/csv"
import { restrictionDisplayItems } from "@/lib/subscription/restrictions"

interface SubscriptionRow {
  id: string
  customer_name?: string
  customer_email?: string
  customer?: { name?: string | null; email?: string | null } | null
  details: Record<string, unknown>
  status: "active" | "cancelled"
  paused_at?: string | null
  remaining_meal_count?: number | null
  created_at: string
  expires_at?: string
  plan?: { id: string; name: string; validity_days: number } | null
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
    restrictedCategories?: string[]
    mealsPerDay?: number
    breakfast?: boolean
    drinks?: boolean
    cakes?: boolean
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
  const csvMenuRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<"active" | "inquiries">("active")

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
      let subscriptionRecipeIds: string[] = []
      const [allRes, subRes] = await Promise.all([
        recipesByName.size === 0 ? fetch("/api/recipe?sort=name") : Promise.resolve(null),
        fetch("/api/recipe?is_subscription_included=true&is_active=true&sort=name"),
      ])
      if (allRes?.ok) {
        const { data } = await allRes.json()
        const active = (data as { id: string; name: string; is_active: boolean }[]).filter((r) => r.is_active !== false)
        setMealNames(Object.fromEntries(active.map((r) => [r.id, r.name])))
        recipesByName = new Map<string, string>()
        for (const recipe of active) {
          const key = recipe.name.trim().toLowerCase()
          if (key && !recipesByName.has(key)) recipesByName.set(key, recipe.id)
        }
      }
      if (subRes.ok) {
        const { data } = await subRes.json()
        subscriptionRecipeIds = (data as { id: string }[]).map((recipe) => recipe.id)
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
          parseSubscriptionCsvRow(col, {
            ...(recipesByName.size > 0 ? { recipesByName } : {}),
            subscriptionRecipeIds,
          })
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
  const activeCount = subscriptions.filter((s) => lifecycleOf(s) === "active").length

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[#0F172A] md:text-2xl">
            <RefreshCcw size={22} className="text-[#475569]" />
            Subscriptions
          </h1>
          <p className="mt-2 text-sm text-[#475569] md:text-base">Active plans and upcoming renewals</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div ref={csvMenuRef} className="relative">
            <button
              type="button"
              aria-label="More subscription tools"
              aria-expanded={csvMenuOpen}
              disabled={importing}
              onClick={() => setCsvMenuOpen((open) => !open)}
              className="flex size-12 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] disabled:opacity-50"
            >
              <Ellipsis size={20} />
            </button>
            {csvMenuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={() => setCsvMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                  <MenuItem
                    icon={<Link2 size={18} className="mt-0.5 shrink-0 text-[#475569]" />}
                    title="Invite link"
                    hint="Create a signed onboarding link"
                    onClick={() => {
                      setCsvMenuOpen(false)
                      setShowInvite(true)
                      setInviteLink("")
                      setInvitePrice("")
                      setInviteMealsPerDay("")
                      setInviteError("")
                      setInviteCopied(false)
                    }}
                  />
                  <MenuItem
                    icon={<FileDown size={18} className="mt-0.5 shrink-0 text-[#475569]" />}
                    title="Download CSV template"
                    hint="Blank file with the subscription columns"
                    onClick={handleDownloadTemplate}
                  />
                  <MenuItem
                    icon={<FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-[#475569]" />}
                    title="Import CSV"
                    hint="Create subscriptions from a spreadsheet"
                    onClick={() => {
                      setCsvMenuOpen(false)
                      csvFileRef.current?.click()
                    }}
                  />
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
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true) }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-5 text-base font-semibold text-white transition-colors hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Subscription</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Subscription sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "active"}
          onClick={() => { setTab("active"); setInquiryId(null); setConfirmDecline(false) }}
          className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm leading-none whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
            tab === "active"
              ? "bg-[#1E293B] font-semibold text-[#F8FAFC]"
              : "font-medium text-[#475569] hover:bg-[rgba(15,23,42,0.04)]"
          }`}
        >
          <Users size={16} />
          <span>Active</span>
          <span className="font-semibold tabular-nums">{activeCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "inquiries"}
          onClick={() => setTab("inquiries")}
          className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm leading-none whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
            tab === "inquiries"
              ? "bg-[#FEF3C7] font-semibold text-[#92400E]"
              : "font-medium text-[#92400E] hover:bg-[rgba(15,23,42,0.04)]"
          }`}
        >
          <Bell size={16} />
          <span>Inquiries</span>
          <span className="font-semibold tabular-nums">{inquiries.length}</span>
        </button>
      </div>

      {importing && (
        <p className="mb-4 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#475569]">
          Importing subscriptions from CSV...
        </p>
      )}
      {importResult && !importing && (
        <div className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${importResult.failed > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800"}`}>
          <p className="flex-1">
            Imported {importResult.created} subscription{importResult.created === 1 ? "" : "s"}
            {importResult.failed > 0 && `, ${importResult.failed} failed`}
            {importResult.errors.map((err, i) => (
              <span key={i} className="mt-1 block text-xs opacity-80">{err}</span>
            ))}
          </p>
          <button type="button" onClick={() => setImportResult(null)} className="shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5" title="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {tab === "active" ? (
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
      ) : loading && inquiries.length === 0 && subscriptions.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#475569]">Loading inquiries...</p>
      ) : inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-white py-20">
          <Bell size={40} className="mb-3 text-[#CBD5E1]" />
          <p className="text-sm font-medium text-[#475569]">No subscription inquiries yet.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] md:px-6">
            {inquiries.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setInquiryId(q.id)
                  const cents = q.details?.invite?.agreedPriceCents
                  setPayTotal(typeof cents === "number" ? (cents / 100).toFixed(2) : "")
                  setPayAmount("")
                  setPayRef("")
                  setApproveError("")
                  setConfirmDecline(false)
                }}
                className="flex w-full items-center gap-3 border-t border-[#F1F5F9] py-3 text-left first:border-t-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] md:min-h-[72px]"
              >
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone(q.id)}`}>
                  {initials(q.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold tracking-tight text-[#0F172A]">{q.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#475569]">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <RefreshCcw size={14} strokeWidth={1.75} className="shrink-0" />
                      <span className="truncate">{q.plan_id}</span>
                    </span>
                    {q.details?.breakfast && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                        <Coffee size={12} strokeWidth={1.75} />
                        Breakfast
                      </span>
                    )}
                    {q.details?.drinks && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                        <CupSoda size={12} strokeWidth={1.75} />
                        Drinks +100
                      </span>
                    )}
                    {q.details?.cakes && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                        <CakeSlice size={12} strokeWidth={1.75} />
                        Cakes +100
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                      {q.details?.onCall ? <PhoneCall size={12} strokeWidth={1.75} /> : <Truck size={12} strokeWidth={1.75} />}
                      {q.details?.onCall ? "On-call" : "Scheduled"}
                    </span>
                  </span>
                </span>
                <ChevronRight size={20} className="shrink-0 text-[#94A3B8]" />
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-[#475569]">
            <Bell size={18} strokeWidth={1.75} />
            {inquiries.length} inquir{inquiries.length === 1 ? "y" : "ies"}
          </p>
        </>
      )}

      {selectedInquiry && (
        <DetailSheet
          title={`Inquiry — ${selectedInquiry.name}`}
          titleId="inquiry-detail-title"
          onClose={() => { setInquiryId(null); setConfirmDecline(false) }}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <Button variant="danger" onClick={handleDeclineInquiry} disabled={declining || approving}>
                <Ban size={14} />
                {declining ? "Declining..." : confirmDecline ? "Confirm decline?" : "Decline"}
              </Button>
              <Button onClick={handleApproveInquiry} disabled={approving || declining}>
                <CheckCircle2 size={14} />
                {approving ? "Approving..." : "Approve subscription"}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Utensils size={14} /> Plan</span><span className="font-semibold">{selectedInquiry.plan_id}</span></div>
            {agreedPriceLabel(selectedInquiry.details) && (
              <div className="flex justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Wallet size={14} /> Agreed price</span>
                <span className="font-semibold">{agreedPriceLabel(selectedInquiry.details)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Phone size={14} /> Mobile</span><span className="font-semibold">{selectedInquiry.mobile_number}</span></div>
            {selectedInquiry.email && <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Mail size={14} /> Email</span><span className="font-semibold">{selectedInquiry.email}</span></div>}
            <div>
              <p className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><MapPin size={14} /> Address</p>
              <p className="font-medium">{selectedInquiry.address}</p>
            </div>
            <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Layers size={14} /> Mode</span><span className="font-semibold capitalize">{selectedInquiry.details?.mode}</span></div>
            <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Utensils size={14} /> Meals per day</span><span className="font-semibold">{selectedInquiry.details?.mealsPerDay ?? 1}</span></div>
            {selectedInquiry.details?.breakfast && (
              <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Coffee size={14} /> Breakfast</span><span className="font-semibold">Included (extra)</span></div>
            )}
            {selectedInquiry.details?.drinks && (
              <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><CupSoda size={14} /> Drinks add-on</span><span className="font-semibold">AED 100 — full bundle</span></div>
            )}
            {selectedInquiry.details?.cakes && (
              <div className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><CakeSlice size={14} /> Cakes add-on</span><span className="font-semibold">AED 100 — full bundle</span></div>
            )}
            {restrictionDisplayItems(selectedInquiry.details).length > 0 && (
              <div>
                <p className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><ShieldAlert size={14} /> Restrictions</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {restrictionDisplayItems(selectedInquiry.details).map((item) => (
                    <span key={item.key} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                      {ingNames[item.key] ?? item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(selectedInquiry.details?.includedMeals ?? []).length > 0 && (
              <div>
                <p className="inline-flex items-center gap-1.5 font-medium text-neutral-700"><Utensils size={14} /> Meals ({selectedInquiry.details.includedMeals?.length})</p>
                <ul className="mt-1 list-disc pl-5 text-neutral-800">
                  {(selectedInquiry.details.includedMeals ?? []).map((id) => (
                    <li key={id}>{mealNames[id] ?? id}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-100 pt-2">
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                {selectedInquiry.details?.onCall ? <PhoneCall size={14} /> : <Truck size={14} />} Delivery
              </span>
              <span className="font-semibold">
                {selectedInquiry.details?.onCall
                  ? "On-call only"
                  : `${(selectedInquiry.details?.days ?? []).join(", ")} · ${selectedSlots.join(", ")}${selectedInquiry.details?.time ? ` ${selectedInquiry.details.time}` : ""}`}
              </span>
            </div>
            {approveError && <p className="text-xs font-medium text-red-500">{approveError}</p>}
            <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">Total price (AED)*</label>
                <input type="number" min={0} step={0.5} value={payTotal} onChange={(e) => setPayTotal(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900" placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">Paying now (AED)*</label>
                <input type="number" min={0} step={0.5} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900" placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">Method</label>
                <Select options={PAYMENT_METHODS} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">Reference</label>
                <input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900" placeholder="Optional" />
              </div>
            </div>
          </div>
        </DetailSheet>
      )}

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
              className="my-8 w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">New Subscription</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">Create a subscription for a customer without the public onboarding flow.</p>
                </div>
                <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700">
                  <X size={18} />
                </button>
              </div>
              <StaffSubscriptionForm
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

function MenuItem({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#F8FAFC]"
    >
      {icon}
      <span>
        <span className="block text-sm font-semibold text-[#0F172A]">{title}</span>
        <span className="block text-xs text-[#475569]">{hint}</span>
      </span>
    </button>
  )
}
