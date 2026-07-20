import type { ReactNode } from "react"

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
}

function getRowValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

export function Table<T>({ columns, data, onRowClick }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-light">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-900 text-white">
            {columns.map((col) => (
              <th key={col.key} className="border-r-2 border-white/20 px-4 py-3 text-left font-medium last:border-r-0">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={String(getRowValue(row, "id") ?? i)}
              className={`border-t border-border-light transition-colors ${
                onRowClick ? "cursor-pointer hover:bg-brand-400/10" : ""
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="border-r-2 border-border-light px-4 py-3 text-text-secondary last:border-r-0"
                >
                  {col.render ? col.render(row) : (getRowValue(row, col.key) as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-secondary">
                No data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
