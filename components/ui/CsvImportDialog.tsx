"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, FileUp } from "lucide-react"
import { CSV_HEADERS } from "@/lib/meals/csv"
import { Button } from "./Button"

export interface CsvImportPreviewRow {
  lineNo: number
  values: Record<string, string>
  status: "new" | "update" | "error"
  error?: string
}

interface CsvImportDialogProps {
  open: boolean
  fileName: string
  rows: CsvImportPreviewRow[]
  importing: boolean
  onClose: () => void
  onConfirm: () => void
}

const SHORT_LABELS: Record<string, string> = {
  id: "ID",
  name: "Name",
  category: "Category",
  description: "Description",
  price_dh: "Price",
  calories: "Cal",
  protein_g: "Protein",
  carbs_g: "Carbs",
  fats_g: "Fats",
  fiber_g: "Fiber",
  sugar_g: "Sugar",
  sodium_mg: "Sodium",
  is_active: "Active",
  image_path: "Image",
}

function statusBadge(status: CsvImportPreviewRow["status"]) {
  if (status === "new") return "bg-green-100 text-green-700"
  if (status === "update") return "bg-blue-100 text-blue-700"
  return "bg-red-100 text-red-600"
}

export function CsvImportDialog({ open, fileName, rows, importing, onClose, onConfirm }: CsvImportDialogProps) {
  const newCount = rows.filter((r) => r.status === "new").length
  const updateCount = rows.filter((r) => r.status === "update").length
  const errorCount = rows.filter((r) => r.status === "error").length
  const validCount = newCount + updateCount

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-sm sm:p-4"
          onClick={() => { if (!importing) onClose() }}
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
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-neutral-900">Preview Import</h2>
                <p className="truncate text-xs text-neutral-500">
                  {fileName} · {newCount} new · {updateCount} update{updateCount === 1 ? "" : "s"}
                  {errorCount > 0 && ` · ${errorCount} invalid (skipped)`}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={importing}
                className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-2 py-2 sm:px-4">
              {rows.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-neutral-50">
                    <tr>
                      <th className="px-1.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Status</th>
                      {CSV_HEADERS.map((h) => (
                        <th key={h} className="min-w-24 px-1.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          {SHORT_LABELS[h] ?? h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.lineNo} className={`border-t border-neutral-100 ${row.status === "error" ? "bg-red-50/60" : row.status === "new" ? "bg-green-50/40" : undefined}`}>
                        <td className="px-1.5 py-1.5 align-top">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge(row.status)}`}>
                            {row.status}
                          </span>
                          {row.error && <span className="mt-1 block max-w-40 text-[11px] leading-snug text-red-600">{row.error}</span>}
                        </td>
                        {CSV_HEADERS.map((h) => (
                          <td key={h} className="max-w-48 truncate px-1.5 py-1.5 align-top text-sm text-neutral-700" title={row.values[h] ?? ""}>
                            {row.values[h] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-12 text-center text-sm text-neutral-500">No data rows found in this file.</p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
              <p className="text-xs text-neutral-500">
                {errorCount > 0 ? "Invalid rows will be skipped." : "All rows are valid and ready to import."}
              </p>
              <div className="flex gap-2 sm:ml-auto">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={importing}>
                  Cancel
                </Button>
                <Button size="sm" onClick={onConfirm} disabled={importing || validCount === 0}>
                  <FileUp size={14} className="mr-1" />
                  {importing ? "Importing..." : `Import ${validCount} Row${validCount === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
