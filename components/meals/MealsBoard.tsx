"use client"

import { useMemo, useRef, useState } from "react"
import useSWR from "swr"
import {
  Download,
  Ellipsis,
  FileDown,
  FileSpreadsheet,
  FileUp,
  Plus,
  Search,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react"
import type { ReactNode } from "react"
import {
  ConfirmDialog,
  CsvEditDialog,
  CsvImportDialog,
  EditMealDialog,
  MealDetailDialog,
  NewMealDialog,
} from "@/components/ui"
import { MealsSectionNav } from "./MealsSectionNav"
import type { CsvImportPreviewRow } from "@/components/ui/CsvImportDialog"
import { invalidateRecipes } from "@/hooks/useRecipes"
import { CSV_HEADERS, downloadCsv, parseCsv } from "@/lib/meals/csv"
import { executeImportRow, importRow, mealToCsvRow, parseImportRow, type ImportResult, type ParsedImportRow } from "./csv-import"
import { MealRow } from "./MealRow"
import {
  CATEGORY_FILTERS,
  mapRecipeToItem,
  type MealListItem,
  type StatusFilter,
} from "./model"

const PER_PAGE = 20
const EMPTY_PAGE = { items: [] as MealListItem[], total: 0 }

async function fetchMealPage(url: string): Promise<{ items: MealListItem[]; total: number }> {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
  const rows: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? [])
  const total = Array.isArray(data) ? rows.length : (data.total ?? rows.length)
  return { items: rows.map(mapRecipeToItem), total }
}

export function MealsBoard() {
  const [showNewMeal, setShowNewMeal] = useState(false)
  const [editItem, setEditItem] = useState<MealListItem | null>(null)
  const [detailItem, setDetailItem] = useState<MealListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MealListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeCat, setActiveCat] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(0)
  const [csvMenuOpen, setCsvMenuOpen] = useState(false)
  const csvMenuRef = useRef<HTMLDivElement>(null)
  const [csvEditOpen, setCsvEditOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
  const [importFileName, setImportFileName] = useState("")
  const [importPreview, setImportPreview] = useState<CsvImportPreviewRow[]>([])
  const [pendingImport, setPendingImport] = useState<{ lineNo: number; parsed: ParsedImportRow }[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({
      sort: "name",
      limit: String(PER_PAGE),
      offset: String(page * PER_PAGE),
      include: "ingredients",
    })
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (activeCat !== "all") params.set("category", activeCat)
    if (statusFilter === "enabled") params.set("is_active", "true")
    if (statusFilter === "disabled") params.set("is_active", "false")
    return `/api/recipe?${params.toString()}`
  }, [page, debouncedSearch, activeCat, statusFilter])

  const { data, isLoading: loading, mutate } = useSWR(listUrl, fetchMealPage, {
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
    keepPreviousData: true,
  })
  const menuItems = data?.items ?? EMPTY_PAGE.items
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const rangeStart = total === 0 ? 0 : page * PER_PAGE + 1
  const rangeEnd = Math.min(total, (page + 1) * PER_PAGE)

  function refresh() {
    void mutate()
    void invalidateRecipes()
  }

  function onSearchChange(value: string) {
    setSearch(value)
    setPage(0)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(value.trim()), 300)
  }

  function selectCategory(value: string) {
    setActiveCat(value)
    setPage(0)
  }

  function selectStatus(value: StatusFilter) {
    setStatusFilter(value)
    setPage(0)
  }

  function handleEdit(item: MealListItem) {
    setEditItem(item)
    setShowNewMeal(true)
  }

  async function handleToggle(item: MealListItem) {
    const next = !(item.is_active ?? true)
    setTogglingId(item.id)
    await mutate(
      (current) =>
        current
          ? { ...current, items: current.items.map((m) => (m.id === item.id ? { ...m, is_active: next } : m)) }
          : current,
      { revalidate: false },
    )
    try {
      const res = await fetch(`/api/recipe/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? "Failed to update meal")
      }
      refresh()
    } catch (e) {
      console.error("[MEALS] Toggle failed:", e instanceof Error ? e.message : e)
      await mutate(
        (current) =>
          current
            ? { ...current, items: current.items.map((m) => (m.id === item.id ? { ...m, is_active: !next } : m)) }
            : current,
        { revalidate: false },
      )
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/recipe/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).error ?? "Failed to delete meal")
      }
      setDeleteTarget(null)
      if (menuItems.length <= 1 && page > 0) setPage(page - 1)
      else refresh()
    } catch (e) {
      console.error("[MEALS] Delete failed:", e instanceof Error ? e.message : e)
    } finally {
      setDeleting(false)
    }
  }

  function handleDialogClose() {
    setShowNewMeal(false)
    setEditItem(null)
    if (page === 0) refresh()
    else setPage(0)
  }

  function exportFilterParams() {
    const base = new URLSearchParams({ sort: "name", limit: "100" })
    if (debouncedSearch) base.set("search", debouncedSearch)
    if (activeCat !== "all") base.set("category", activeCat)
    if (statusFilter === "enabled") base.set("is_active", "true")
    if (statusFilter === "disabled") base.set("is_active", "false")
    return base
  }

  async function fetchAllFiltered(): Promise<MealListItem[]> {
    const base = exportFilterParams()
    const all: MealListItem[] = []
    let offset = 0
    let expected = Infinity
    while (offset < expected) {
      const params = new URLSearchParams(base)
      params.set("offset", String(offset))
      const res = await fetch(`/api/recipe?${params.toString()}`)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "Failed to fetch recipes")
      const rows: Record<string, unknown>[] = Array.isArray(payload) ? payload : (payload.data ?? [])
      expected = Array.isArray(payload) ? rows.length : (payload.total ?? rows.length)
      if (rows.length === 0) break
      all.push(...rows.map(mapRecipeToItem))
      offset += rows.length
      if (rows.length < 100) break
    }
    return all
  }

  function handleDownloadTemplate() {
    setCsvMenuOpen(false)
    downloadCsv("meals-template.csv", CSV_HEADERS, [])
  }

  async function handleExportCsv() {
    setCsvMenuOpen(false)
    setExporting(true)
    try {
      const all = await fetchAllFiltered()
      downloadCsv(
        `meals-${new Date().toISOString().slice(0, 10)}.csv`,
        CSV_HEADERS,
        all.map(mealToCsvRow),
      )
    } catch (e) {
      console.error("[MEALS] Export failed:", e instanceof Error ? e.message : e)
    } finally {
      setExporting(false)
    }
  }

  async function saveCsvRows(rows: Record<string, string>[]): Promise<ImportResult> {
    let created = 0
    let updated = 0
    const errors: string[] = []
    for (let i = 0; i < rows.length; i++) {
      try {
        const outcome = await importRow(rows[i], i + 1)
        if (outcome === "created") created++
        else updated++
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `row ${i + 1}: failed`)
      }
    }
    refresh()
    return { created, updated, failed: errors.length, errors: errors.slice(0, 5) }
  }

  async function handleImportFile(file: File) {
    setCsvMenuOpen(false)
    setImportResult(null)
    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      if (parsed.length < 2) throw new Error("CSV has no data rows")
      const headers = parsed[0].map((h) => h.trim().toLowerCase())
      if (!headers.includes("name")) throw new Error('CSV must have a "name" column')
      const colIndex: Record<string, number> = {}
      for (const h of CSV_HEADERS) colIndex[h] = headers.indexOf(h)

      const preview: CsvImportPreviewRow[] = []
      const pending: { lineNo: number; parsed: ParsedImportRow }[] = []
      for (let i = 1; i < parsed.length; i++) {
        const cells = parsed[i]
        const col: Record<string, string> = {}
        for (const h of CSV_HEADERS) {
          const idx = colIndex[h]
          col[h] = idx === -1 ? "" : (cells[idx] ?? "")
        }
        try {
          const validated = parseImportRow(col, i + 1)
          pending.push({ lineNo: i + 1, parsed: validated })
          preview.push({ lineNo: i + 1, values: col, status: validated.id ? "update" : "new" })
        } catch (e) {
          preview.push({ lineNo: i + 1, values: col, status: "error", error: e instanceof Error ? e.message : "Invalid row" })
        }
      }
      setImportFileName(file.name)
      setImportPreview(preview)
      setPendingImport(pending)
      setImportPreviewOpen(true)
    } catch (e) {
      setImportResult({ created: 0, updated: 0, failed: 1, errors: [e instanceof Error ? e.message : "Import failed"] })
    }
  }

  async function handleConfirmImport() {
    if (pendingImport.length === 0 || importing) return
    setImporting(true)
    try {
      let created = 0
      let updated = 0
      const errors: string[] = []
      for (const { lineNo, parsed } of pendingImport) {
        try {
          const outcome = await executeImportRow(parsed, lineNo)
          if (outcome === "created") created++
          else updated++
        } catch (e) {
          errors.push(e instanceof Error ? e.message : `line ${lineNo}: failed`)
        }
      }
      setImportResult({ created, updated, failed: errors.length, errors: errors.slice(0, 5) })
      refresh()
    } finally {
      setImporting(false)
      setImportPreviewOpen(false)
      setPendingImport([])
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[#0F172A] md:text-2xl">
            <Utensils size={22} className="text-[#475569]" />
            Meals
          </h1>
          <p className="mt-2 text-sm text-[#475569] md:text-base">Menu and nutrition</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div ref={csvMenuRef} className="relative">
            <button
              type="button"
              aria-label="CSV tools"
              aria-expanded={csvMenuOpen}
              disabled={exporting || importing}
              onClick={() => setCsvMenuOpen((open) => !open)}
              className="flex size-12 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] disabled:opacity-50"
            >
              <Ellipsis size={20} />
            </button>
            {csvMenuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={() => setCsvMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                  <CsvMenuItem
                    icon={<FileDown size={18} className="mt-0.5 shrink-0 text-[#475569]" />}
                    title="Download CSV template"
                    hint="Blank file with the correct headers"
                    onClick={handleDownloadTemplate}
                  />
                  <CsvMenuItem
                    icon={<FileUp size={18} className="mt-0.5 shrink-0 text-[#475569]" />}
                    title="Edit in CSV"
                    hint={`Spreadsheet table to bulk-edit ${total} meal${total === 1 ? "" : "s"}`}
                    onClick={() => {
                      setCsvMenuOpen(false)
                      setCsvEditOpen(true)
                    }}
                  />
                  <CsvMenuItem
                    icon={<Download size={18} className="mt-0.5 shrink-0 text-[#475569]" />}
                    title="Export CSV"
                    hint={`Download ${total} meal${total === 1 ? "" : "s"} as a file`}
                    disabled={total === 0 || exporting}
                    onClick={() => { void handleExportCsv() }}
                  />
                  <CsvMenuItem
                    icon={<FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-[#475569]" />}
                    title="Import CSV"
                    hint="Create new or update existing meals"
                    onClick={() => {
                      setCsvMenuOpen(false)
                      fileRef.current?.click()
                    }}
                  />
                </div>
              </>
            )}
            <input
              ref={fileRef}
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
            onClick={() => {
              setEditItem(null)
              setShowNewMeal(true)
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-5 text-base font-semibold text-white transition-colors hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Meal</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <MealsSectionNav />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#475569]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search meals..."
            className="h-12 w-full rounded-xl border border-[#64748B] bg-white pr-4 pl-11 text-base text-[#1E293B] placeholder:text-[#475569] focus:outline-2 focus:outline-offset-2 focus:outline-[#15803D]"
          />
        </div>
        <div className="flex rounded-xl bg-[#F1F5F9] p-1">
          {(["all", "enabled", "disabled"] as StatusFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => selectStatus(value)}
              className={`h-10 rounded-lg px-3 text-sm font-medium capitalize transition-colors ${
                statusFilter === value
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#475569] hover:text-[#1E293B]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_FILTERS.map((cat) => {
            const active = activeCat === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => selectCategory(cat.value)}
                className={`inline-flex h-10 shrink-0 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
                  active
                    ? "bg-[#1E293B] font-semibold text-[#F8FAFC]"
                    : "bg-[#F1F5F9] font-medium text-[#334155] hover:bg-[#E2E8F0]"
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#F8FAFC] to-transparent" />
      </div>

      {importing && (
        <p className="mb-4 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#475569]">
          Importing meals from CSV...
        </p>
      )}
      {importResult && !importing && (
        <div className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${importResult.failed > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800"}`}>
          <p className="flex-1">
            Imported {importResult.created} new, updated {importResult.updated}
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

      {loading && !data ? (
        <p className="py-12 text-center text-sm text-[#475569]">Loading meals...</p>
      ) : menuItems.length > 0 ? (
        <>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] md:px-6">
            {menuItems.map((item) => (
              <MealRow
                key={item.id}
                item={item}
                toggling={togglingId === item.id}
                onToggle={handleToggle}
                onView={setDetailItem}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#475569]">
              Showing {rangeStart}–{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#475569] transition-colors hover:border-[#CBD5E1] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-[#475569]">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#475569] transition-colors hover:border-[#CBD5E1] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-white py-20">
          <UtensilsCrossed size={40} className="mb-3 text-[#CBD5E1]" />
          <p className="text-sm font-medium text-[#475569]">No meals found.</p>
        </div>
      )}

      <NewMealDialog open={showNewMeal && !editItem} onClose={handleDialogClose} />
      {editItem && (
        <EditMealDialog open={!!editItem} onClose={handleDialogClose} item={editItem} />
      )}
      <CsvEditDialog
        open={csvEditOpen}
        onClose={() => setCsvEditOpen(false)}
        onLoad={fetchAllFiltered}
        onSave={saveCsvRows}
      />
      <CsvImportDialog
        open={importPreviewOpen}
        fileName={importFileName}
        rows={importPreview}
        importing={importing}
        onClose={() => { if (!importing) { setImportPreviewOpen(false); setPendingImport([]) } }}
        onConfirm={handleConfirmImport}
      />
      <MealDetailDialog
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={(item) => { setDetailItem(null); handleEdit(item as MealListItem) }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={handleDelete}
        title="Delete Meal"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}

function CsvMenuItem({
  icon,
  title,
  hint,
  onClick,
  disabled,
}: {
  icon: ReactNode
  title: string
  hint: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#F8FAFC] disabled:opacity-40"
    >
      {icon}
      <span>
        <span className="block text-sm font-semibold text-[#0F172A]">{title}</span>
        <span className="block text-xs text-[#475569]">{hint}</span>
      </span>
    </button>
  )
}
