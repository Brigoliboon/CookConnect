export const CSV_HEADERS = [
  "id",
  "name",
  "category",
  "description",
  "price_dh",
  "calories",
  "protein_g",
  "carbs_g",
  "fats_g",
  "fiber_g",
  "sugar_g",
  "sodium_mg",
  "is_active",
  "image_path",
]

export function toCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const lines = [header.join(","), ...rows.map((r) => r.map(toCsvCell).join(","))]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else inQuotes = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      cell = ""
      if (row.length > 1 || row[0] !== "") rows.push(row)
      row = []
    } else {
      cell += ch
    }
  }
  row.push(cell)
  if (row.length > 1 || row[0] !== "") rows.push(row)
  return rows
}
