"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Download } from "lucide-react"
import { MENU_CATEGORIES } from "@/constants"
import { CSV_HEADERS, downloadCsv } from "@/lib/meals/csv"
import { Button } from "./Button"

export interface CsvMealRow {
  id: string
  name: string
  category: string
  description: string
  price: number
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
  sugar: number
  sodium: number
  is_active?: boolean
  image_path: string | null
}

export interface CsvSaveResult {
  created: number
  updated: number
  failed: number
  errors: string[]
}

interface CsvEditDialogProps {
  open: boolean
  onClose: () => void
  onLoad: () => Promise<CsvMealRow[]>
  onSave: (rows: Record<string, string>[]) => Promise<CsvSaveResult>
}

type CellKind = "readonly" | "text" | "number" | "category" | "bool"

const COLUMNS: { key: string; label: string; width: string; kind: CellKind }[] = [
  { key: "id", label: "ID", width: "min-w-20 max-w-28", kind: "readonly" },
  { key: "name", label: "Name", width: "min-w-44", kind: "text" },
  { key: "category", label: "Category", width: "min-w-32", kind: "category" },
  { key: "description", label: "Description", width: "min-w-56", kind: "text" },
  { key: "price_dh", label: "Price", width: "min-w-20", kind: "number" },
  { key: "calories", label: "Cal", width: "min-w-20", kind: "number" },
  { key: "protein_g", label: "Protein", width: "min-w-20", kind: "number" },
  { key: "carbs_g", label: "Carbs", width: "min-w-20", kind: "number" },
  { key: "fats_g", label: "Fats", width: "min-w-20", kind: "number" },
  { key: "fiber_g", label: "Fiber", width: "min-w-20", kind: "number" },
  { key: "sugar_g", label: "Sugar", width: "min-w-20", kind: "number" },
  { key: "sodium_mg", label: "Sodium", width: "min-w-20", kind: "number" },
  { key: "is_active", label: "Active", width: "min-w-24", kind: "bool" },
  { key: "image_path", label: "Image", width: "min-w-44", kind: "text" },
]

const MAX_ROWS = 200

function rowToDraft(row: CsvMealRow): Record<string, string> {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? "",
    price_dh: String(row.price ?? ""),
    calories: String(row.calories ?? ""),
    protein_g: String(row.protein ?? ""),
    carbs_g: String(row.carbs ?? ""),
    fats_g: String(row.fats ?? ""),
    fiber_g: String(row.fiber ?? ""),
    sugar_g: String(row.sugar ?? ""),
    sodium_mg: String(row.sodium ?? ""),
    is_active: (row.is_active ?? true) ? "true" : "false",
    image_path: row.image_path ?? "",
  }
}

function blankDraft(): Record<string, string> {
  const draft: Record<string, string> = {}
  for (const h of CSV_HEADERS) draft[h] = ""
  draft.is_active = "true"
  return draft
}

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"

export function CsvEditDialog({ open, onClose, onLoad, onSave }: CsvEditDialogProps) {
  const [keys, setKeys] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [initial, setInitial] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<CsvSaveResult | null>(null)
  const [truncated, setTruncated] = useState(false)
  const newCounter = useRef(0)

  async function loadRows() {
    setResult(null)
    setLoading(true)
    try {
      const rows = await onLoad()
      const capped = rows.slice(0, MAX_ROWS)
      setTruncated(rows.length > MAX_ROWS)
      const nextKeys: string[] = []
      const nextDrafts: Record<string, Record<string, string>> = {}
      for (const row of capped) {
        nextKeys.push(row.id)
        nextDrafts[row.id] = rowToDraft(row)
      }
      setKeys(nextKeys)
      setDrafts(nextDrafts)
      setInitial(structuredClone(nextDrafts))
    } catch (e) {
      console.error("[CSV_EDIT] Load failed:", e instanceof Error ? e.message : e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function updateCell(key: string, field: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function addRow() {
    newCounter.current += 1
    const key = `new-${newCounter.current}`
    setKeys((prev) => [...prev, key])
    setDrafts((prev) => ({ ...prev, [key]: blankDraft() }))
  }

  const dirtyKeys = keys.filter(
    (k) => k.startsWith("new-") || JSON.stringify(drafts[k]) !== JSON.stringify(initial[k]),
  )

  async function handleSave() {
    if (dirtyKeys.length === 0 || saving) return
    setSaving(true)
    setResult(null)
    try {
      const res = await onSave(dirtyKeys.map((k) => drafts[k]))
      setResult(res)
      const fresh = await onLoad()
      const capped = fresh.slice(0, MAX_ROWS)
      setTruncated(fresh.length > MAX_ROWS)
      const nextKeys: string[] = []
      const nextDrafts: Record<string, Record<string, string>> = {}
      for (const row of capped) {
        nextKeys.push(row.id)
        nextDrafts[row.id] = rowToDraft(row)
      }
      setKeys(nextKeys)
      setDrafts(nextDrafts)
      setInitial(structuredClone(nextDrafts))
    } catch (e) {
      setResult({ created: 0, updated: 0, failed: 1, errors: [e instanceof Error ? e.message : "Save failed"] })
    } finally {
      setSaving(false)
    }
  }

  function handleDownload() {
    downloadCsv(
      `meals-${new Date().toISOString().slice(0, 10)}.csv`,
      CSV_HEADERS,
      keys.map((k) => CSV_HEADERS.map((h) => drafts[k]?.[h] ?? "")),
    )
  }

  function renderCell(key: string, col: (typeof COLUMNS)[number]) {
    const value = drafts[key]?.[col.key] ?? ""
    if (col.kind === "readonly") {
      return (
        <span className="block truncate font-mono text-[11px] text-neutral-400" title={value}>
          {value ? value.slice(0, 8) : "new"}
        </span>
      )
    }
    if (col.kind === "category") {
      return (
        <select value={value} onChange={(e) => updateCell(key, col.key, e.target.value)} className={inputClass}>
          <option value="">—</option>
          {MENU_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      )
    }
    if (col.kind === "bool") {
      return (
        <select value={value} onChange={(e) => updateCell(key, col.key, e.target.value)} className={inputClass}>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      )
    }
    return (
      <input
        type={col.kind === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => updateCell(key, col.key, e.target.value)}
        className={inputClass}
      />
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-sm sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Edit Meals (CSV)</h2>
                <p className="text-xs text-neutral-500">
                  {keys.length} row{keys.length === 1 ? "" : "s"} · {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? "" : "s"}
                  {truncated && ` · showing first ${MAX_ROWS}, refine filters to see more`}
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-2 py-2 sm:px-4">
              {loading ? (
                <p className="py-12 text-center text-sm text-neutral-500">Loading meals...</p>
              ) : keys.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-neutral-50">
                    <tr>
                      {COLUMNS.map((col) => (
                        <th key={col.key} className={`px-1.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 ${col.width}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key} className={key.startsWith("new-") ? "bg-green-50/50" : undefined}>
                        {COLUMNS.map((col) => (
                          <td key={col.key} className={`border-t border-neutral-100 px-1.5 py-1 ${col.width}`}>
                            {renderCell(key, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-12 text-center text-sm text-neutral-500">No meals match the current filters.</p>
              )}

              {result && (
                <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${result.failed > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800"}`}>
                  Saved {result.created} new, updated {result.updated}
                  {result.failed > 0 && `, ${result.failed} failed`}
                  {result.errors.map((err, i) => (
                    <span key={i} className="mt-1 block text-xs opacity-80">{err}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus size={14} className="mr-1" />
                Add Row
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload} disabled={keys.length === 0}>
                <Download size={14} className="mr-1" />
                Download CSV
              </Button>
              <div className="flex gap-2 sm:ml-auto">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Close
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || dirtyKeys.length === 0}>
                  {saving ? "Saving..." : `Save Changes${dirtyKeys.length > 0 ? ` (${dirtyKeys.length})` : ""}`}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
