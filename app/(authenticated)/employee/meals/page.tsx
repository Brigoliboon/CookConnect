"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { Button, NewMealDialog, EditMealDialog, ConfirmDialog, MealDetailDialog, CsvEditDialog, CsvImportDialog } from "@/components/ui"
import type { CsvImportPreviewRow } from "@/components/ui/CsvImportDialog"
import { MENU_CATEGORIES } from "@/constants"
import type { MenuCategory, MenuItem, MealServingOption } from "@/constants"
import { CSV_HEADERS, downloadCsv, parseCsv } from "@/lib/meals/csv"
import { imageVariant } from "@/lib/images"
import { Plus, UtensilsCrossed, Utensils, Search, Pencil, Trash2, Power, PowerOff, FileSpreadsheet, FileDown, FileUp, Download, ChevronDown, X, LayoutGrid, Drumstick, Beef, Fish, Salad, Sandwich, Egg, Wheat, Soup, Pizza, Hamburger, CupSoda, CookingPot, ChefHat, Blender, Citrus, Coffee, CakeSlice, HandPlatter, Carrot, type LucideIcon } from "lucide-react"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  chicken: Drumstick,
  beef: Beef,
  seafood: Fish,
  salad: Salad,
  wrap: Sandwich,
  breakfast: Egg,
  pasta: Wheat,
  soup: Soup,
  pizza: Pizza,
  burgers: Hamburger,
  drinks: CupSoda,
  biryani: CookingPot,
  risotto: ChefHat,
  smoothie: Blender,
  juice: Citrus,
  beverages: Coffee,
  desserts: CakeSlice,
  "rice-sides": CookingPot,
  platters: HandPlatter,
  vegetable: Carrot,
}

type MealListItem = MenuItem & { is_active?: boolean }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

type StatusFilter = "all" | "enabled" | "disabled"

function formatMicros(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0
}

const PER_PAGE = 8

const VALID_CATEGORIES: Set<string> = new Set(MENU_CATEGORIES.map((c) => c.value))

interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: string[]
}

function mapRecipeToItem(r: Record<string, unknown>): MealListItem {
  const rawServings = (r.servings as Record<string, unknown>[]) ?? []
  const servings: MealServingOption[] = rawServings
    .filter((s) => (s.is_active as boolean) !== false)
    .map((s, i): MealServingOption => ({
      id: (s.id as string) ?? `${r.id as string}-serving-${i}`,
      name: (s.name as string | null) ?? null,
      price: (s.price as number | null) ?? null,
      calories: (s.calories as number | null) ?? null,
      nutrition: (s.nutrition as MealServingOption["nutrition"]) ?? null,
      is_active: (s.is_active as boolean) ?? true,
    }))
  const firstServing = rawServings[0] as Record<string, unknown> | undefined
  const firstNutrition = (firstServing?.nutrition as Record<string, unknown> | null)
    ?? (r.nutrition as Record<string, unknown> | null)

  const rawIngredients = (r.ingredients as MealListItem["ingredients"])
    ?? (firstServing?.ingredients as unknown as MealListItem["ingredients"])
    ?? []
  const ingredients: MealListItem["ingredients"] = (rawIngredients as unknown[]).map((ing) => {
    if (typeof ing === "string") return { name: ing, quantity_g: 100, unit: null }
    const o = ing as Record<string, unknown>
    const nested = o.ingredient as Record<string, unknown> | undefined
    return {
      name: ((nested?.name ?? o.name) as string) ?? "",
      quantity_g: ((o.quantity_g ?? 100) as number) ?? 100,
      unit: ((o.unit ?? null) as string | null) ?? null,
    }
  })

  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as MenuCategory) ?? "chicken",
    description: (r.description as string) ?? "",
    price: ((firstServing?.price ?? r.price) as number) ?? 0,
    calories: ((firstServing?.calories ?? r.calories) as number) ?? 0,
    protein: (firstNutrition?.protein_g as number) ?? 0,
    carbs: (firstNutrition?.carbs_g as number) ?? 0,
    fats: (firstNutrition?.fats_g as number) ?? (firstNutrition?.fat_g as number) ?? 0,
    fiber: (firstNutrition?.fiber_g as number) ?? 0,
    sugar: (firstNutrition?.sugar_g as number) ?? 0,
    sodium: (firstNutrition?.sodium_mg as number) ?? 0,
    image_path: (r.image_path as string) ?? null,
    ingredients,
    servings,
    is_active: (r.is_active as boolean) ?? true,
  }
}

export default function EmployeeMealsPage() {
  const [menuItems, setMenuItems] = useState<MealListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewMeal, setShowNewMeal] = useState(false)
  const [editItem, setEditItem] = useState<MealListItem | null>(null)
  const [detailItem, setDetailItem] = useState<MealListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MealListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeCat, setActiveCat] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [csvMenuOpen, setCsvMenuOpen] = useState(false)
  const [csvEditOpen, setCsvEditOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
  const [importFileName, setImportFileName] = useState("")
  const [importPreview, setImportPreview] = useState<CsvImportPreviewRow[]>([])
  const [pendingImport, setPendingImport] = useState<{ lineNo: number; parsed: ParsedImportRow }[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort: "name", limit: String(PER_PAGE), offset: String(page * PER_PAGE) })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (activeCat !== "all") params.set("category", activeCat)
      if (statusFilter === "enabled") params.set("is_active", "true")
      if (statusFilter === "disabled") params.set("is_active", "false")
      const res = await fetch(`/api/recipe?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
      const rows: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? [])
      const fetchedTotal = Array.isArray(data) ? rows.length : (data.total ?? rows.length)
      setMenuItems(rows.map(mapRecipeToItem))
      setTotal(fetchedTotal)
      const lastPage = Math.max(0, Math.ceil(fetchedTotal / PER_PAGE) - 1)
      if (page > lastPage) setPage(lastPage)
    } catch (e) {
      console.error("[MEALS] Failed to fetch recipes:", e instanceof Error ? e.message : e)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, activeCat, statusFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecipes()
  }, [fetchRecipes])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const rangeStart = total === 0 ? 0 : page * PER_PAGE + 1
  const rangeEnd = Math.min(total, (page + 1) * PER_PAGE)

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
    // Optimistic update; refetch afterwards since a status filter may hide the row
    setMenuItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_active: next } : m)))
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
      fetchRecipes()
    } catch (e) {
      console.error("[MEALS] Toggle failed:", e instanceof Error ? e.message : e)
      setMenuItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_active: !next } : m)))
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
      // Step back a page if we just removed the last row on this page
      if (menuItems.length <= 1 && page > 0) setPage(page - 1)
      else fetchRecipes()
    } catch (e) {
      console.error("[MEALS] Delete failed:", e instanceof Error ? e.message : e)
    } finally {
      setDeleting(false)
    }
  }

  function handleDialogClose() {
    setShowNewMeal(false)
    setEditItem(null)
    if (page === 0) fetchRecipes()
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
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
      const rows: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? [])
      expected = Array.isArray(data) ? rows.length : (data.total ?? rows.length)
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
        all.map((m) => [
          m.id, m.name, m.category, m.description, m.price, m.calories,
          m.protein, m.carbs, m.fats, m.fiber, m.sugar, m.sodium,
          (m.is_active ?? true) ? "true" : "false", m.image_path ?? "",
        ]),
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
    fetchRecipes()
    return { created, updated, failed: errors.length, errors: errors.slice(0, 5) }
  }

  function parseOptionalNumber(raw: string): number | null | { error: string } {
    const v = raw.trim()
    if (!v) return null
    const n = Number(v)
    if (!Number.isFinite(n)) return { error: `"${raw}" is not a number` }
    return n
  }

  function parseOptionalBool(raw: string): boolean | undefined | { error: string } {
    const v = raw.trim().toLowerCase()
    if (!v) return undefined
    if (["true", "1", "yes", "y"].includes(v)) return true
    if (["false", "0", "no", "n"].includes(v)) return false
    return { error: `"${raw}" is not true/false` }
  }

  interface ParsedImportRow {
    id: string
    name: string
    category: string | null
    description: string | null
    imagePath: string | null
    price: number | null
    calories: number | null
    nutrition: {
      protein_g: number
      carbs_g: number
      fats_g: number
      fiber_g: number
      sugar_g: number
      sodium_mg: number
    }
    isActive: boolean | undefined
  }

  function parseImportRow(col: Record<string, string>, lineNo: number): ParsedImportRow {
    const name = (col.name ?? "").trim()
    if (!name) throw new Error(`line ${lineNo}: name is required`)
    const rawCategory = (col.category ?? "").trim()
    if (rawCategory && !VALID_CATEGORIES.has(rawCategory)) {
      throw new Error(`line ${lineNo}: unknown category "${rawCategory}"`)
    }
    const description = (col.description ?? "").trim() || null
    const imagePath = (col.image_path ?? "").trim() || null

    const price = parseOptionalNumber(col.price_dh ?? "")
    if (price !== null && typeof price === "object") throw new Error(`line ${lineNo}: price ${price.error}`)
    const caloriesRaw = parseOptionalNumber(col.calories ?? "")
    if (caloriesRaw !== null && typeof caloriesRaw === "object") throw new Error(`line ${lineNo}: calories ${caloriesRaw.error}`)
    const calories = caloriesRaw === null ? null : Math.round(caloriesRaw)
    const macros: Record<string, number | null> = {}
    for (const [key, field] of [["protein_g", "protein"], ["carbs_g", "carbs"], ["fats_g", "fats"], ["fiber_g", "fiber"], ["sugar_g", "sugar"], ["sodium_mg", "sodium"]] as const) {
      const parsed = parseOptionalNumber(col[key] ?? "")
      if (parsed !== null && typeof parsed === "object") throw new Error(`line ${lineNo}: ${key} ${parsed.error}`)
      macros[field] = parsed
    }
    const isActive = parseOptionalBool(col.is_active ?? "")
    if (typeof isActive === "object") throw new Error(`line ${lineNo}: is_active ${isActive.error}`)

    return {
      id: (col.id ?? "").trim(),
      name,
      category: rawCategory || null,
      description,
      imagePath,
      price,
      calories,
      nutrition: {
        protein_g: macros.protein ?? 0,
        carbs_g: macros.carbs ?? 0,
        fats_g: macros.fats ?? 0,
        fiber_g: macros.fiber ?? 0,
        sugar_g: macros.sugar ?? 0,
        sodium_mg: macros.sodium ?? 0,
      },
      isActive,
    }
  }

  async function executeImportRow(p: ParsedImportRow, lineNo: number): Promise<"created" | "updated"> {
    const { id, name, category, description, imagePath, price, calories, nutrition, isActive } = p
    if (id) {
      const patchRes = await fetch(`/api/recipe/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(category ? { category } : {}),
          description,
          ...(imagePath ? { image_path: imagePath } : {}),
          ...(isActive !== undefined ? { is_active: isActive } : {}),
        }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}))
        throw new Error(`line ${lineNo}: update failed (${(err as Record<string, string>).error ?? patchRes.status})`)
      }
      const servingsRes = await fetch(`/api/recipe/${id}/servings`)
      const servingsData = servingsRes.ok ? await servingsRes.json() : []
      const servings: Record<string, unknown>[] = Array.isArray(servingsData) ? servingsData : (servingsData.data ?? [])
      const firstServingId = servings[0]?.id as string | undefined
      const servingBody = {
        ...(price !== null ? { price } : {}),
        ...(calories !== null ? { calories } : {}),
        nutrition,
      }
      if (firstServingId) {
        await fetch(`/api/recipe/${id}/servings/${firstServingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(servingBody),
        })
      } else if (price !== null || calories !== null) {
        await fetch(`/api/recipe/${id}/servings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Regular", is_active: true, ...servingBody, ingredients: [] }),
        })
      }
      return "updated"
    }

    const createRes = await fetch("/api/recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        description,
        image_path: imagePath,
      }),
    })
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}))
      throw new Error(`line ${lineNo}: create failed (${(err as Record<string, string>).error ?? createRes.status})`)
    }
    const recipe = await createRes.json()
    await fetch(`/api/recipe/${recipe.id}/servings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Regular",
        price,
        calories,
        nutrition,
        is_active: true,
        ingredients: [],
      }),
    })
    return "created"
  }

  async function importRow(col: Record<string, string>, lineNo: number): Promise<"created" | "updated"> {
    return executeImportRow(parseImportRow(col, lineNo), lineNo)
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
      fetchRecipes()
    } finally {
      setImporting(false)
      setImportPreviewOpen(false)
      setPendingImport([])
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Meals</h1>
              <p className="text-sm text-neutral-500">
                {total} meal{total === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <Button variant="outline" onClick={() => setCsvMenuOpen((v) => !v)} disabled={exporting || importing}>
                <FileSpreadsheet size={16} className="mr-1" />
                <span className="hidden sm:inline">{exporting ? "Exporting..." : importing ? "Importing..." : "CSV Tools"}</span>
                <span className="sm:hidden">{exporting ? "..." : importing ? "..." : "CSV"}</span>
                <ChevronDown size={14} className="ml-1" />
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
                        <span className="block text-xs text-neutral-500">Blank file with the correct headers</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCsvMenuOpen(false); setImportResult(null); setCsvEditOpen(true) }}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                    >
                      <FileUp size={18} className="mt-0.5 shrink-0 text-neutral-500" />
                      <span>
                        <span className="block text-sm font-semibold text-neutral-900">Edit in CSV</span>
                        <span className="block text-xs text-neutral-500">Spreadsheet table to bulk-edit {total} meal{total === 1 ? "" : "s"}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={total === 0}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 disabled:opacity-40"
                    >
                      <Download size={18} className="mt-0.5 shrink-0 text-neutral-500" />
                      <span>
                        <span className="block text-sm font-semibold text-neutral-900">Export CSV</span>
                        <span className="block text-xs text-neutral-500">Download {total} meal{total === 1 ? "" : "s"} as a file</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCsvMenuOpen(false); fileRef.current?.click() }}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                    >
                      <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-neutral-500" />
                      <span>
                        <span className="block text-sm font-semibold text-neutral-900">Import CSV</span>
                        <span className="block text-xs text-neutral-500">Create new or update existing meals</span>
                      </span>
                    </button>
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
                  if (file) handleImportFile(file)
                }}
              />
            </div>
            <Button onClick={() => { setEditItem(null); setShowNewMeal(true) }}>
              <Plus size={16} className="mr-1" />
              New Meal
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              className="w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-2.5 pl-10 text-sm text-neutral-900 outline-none backdrop-blur-sm placeholder:text-neutral-400 focus:border-neutral-400"
              placeholder="Search meals..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white/80 p-1 backdrop-blur-sm">
            {(["all", "enabled", "disabled"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => selectStatus(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  statusFilter === s
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <nav className="mb-5 flex gap-1 overflow-x-auto pb-2 sm:gap-2">
          {[{ label: "All", value: "all" }, ...MENU_CATEGORIES].map((cat) => {
            const isActive = activeCat === cat.value
            const Icon = CATEGORY_ICONS[cat.value] ?? Utensils
            return (
              <button
                key={cat.value}
                onClick={() => selectCategory(cat.value)}
                className={`flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition-all ${
                  isActive
                    ? "bg-brand-900 text-white shadow-md"
                    : "bg-white text-neutral-500 ring-1 ring-border-light hover:text-brand-900 hover:ring-brand-900"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="text-center text-[11px] font-medium leading-tight">{cat.label}</span>
              </button>
            )
          })}
        </nav>

        {importing && (
          <p className="mb-4 rounded-xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm text-neutral-600">
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
            <button onClick={() => setImportResult(null)} className="shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5" title="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">Loading meals...</p>
        ) : menuItems.length > 0 ? (
          <>
          <div className="space-y-3">
            {menuItems.map((item, i) => {
              const enabled = item.is_active ?? true
              const toggling = togglingId === item.id
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                  className={`rounded-2xl border border-neutral-200/60 bg-white/80 p-3 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50 sm:p-4 ${enabled ? "" : "opacity-70"}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                    <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                      <button
                        onClick={() => setDetailItem(item)}
                        className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-300 sm:size-24 lg:size-28"
                      >
                        {item.image_path ? (
                          <img src={imageVariant(item.image_path, 600)} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        ) : (
                          <UtensilsCrossed size={28} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setDetailItem(item)}
                            className="truncate text-left text-sm font-semibold text-neutral-900 hover:underline sm:text-base"
                          >
                            {item.name}
                          </button>
                          {!enabled && (
                            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                              Disabled
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium capitalize text-neutral-600">
                            {MENU_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category}
                          </span>
                          <span className="font-bold text-neutral-900">{item.price} <span className="font-semibold text-neutral-400">DH</span></span>
                          <span className="font-semibold">{item.calories} Cal</span>
                          <span>P {formatMicros(item.protein)}g</span>
                          <span>C {formatMicros(item.carbs)}g</span>
                          <span>F {formatMicros(item.fats)}g</span>
                        </div>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500 sm:text-sm">{item.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 md:flex-col md:justify-center lg:flex-row lg:items-center">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        title="Edit meal"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-all hover:border-neutral-400 hover:text-neutral-900 md:flex-none"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        disabled={toggling}
                        title={enabled ? "Disable meal" : "Enable meal"}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-40 md:flex-none ${
                          enabled
                            ? "border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:bg-amber-100"
                            : "border-green-200 bg-green-50 text-green-600 hover:border-green-300 hover:bg-green-100"
                        }`}
                      >
                        {enabled ? <PowerOff size={14} /> : <Power size={14} />}
                        {enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        title="Delete meal"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition-all hover:border-red-300 hover:bg-red-100 hover:text-red-600 md:flex-none"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">
              Showing {rangeStart}–{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2 sm:ml-auto">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-xl border border-neutral-200 bg-white/80 px-4 py-2 text-xs font-semibold text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-neutral-500">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-xl border border-neutral-200 bg-white/80 px-4 py-2 text-xs font-semibold text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-neutral-200 py-20">
            <UtensilsCrossed size={40} className="text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No meals found.</p>
          </div>
        )}
      </motion.div>

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
    </motion.div>
  )
}
