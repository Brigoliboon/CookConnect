"use client"

import { useState } from "react"
import { Search, Filter, ChevronDown } from "lucide-react"
import { DeliveryStatusItem } from "./DeliveryStatusItem"
import type { Delivery } from "@/constants"

const INTENT_FILTERS = ["all", "today", "skip", "delivered"] as const
const PER_PAGE = 5

interface StatusGalleryProps {
  deliveries: Delivery[]
}

export function StatusGallery({ deliveries }: StatusGalleryProps) {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [intentFilter, setIntentFilter] = useState<string>("all")
  const [showFilter, setShowFilter] = useState(false)

  const filtered = deliveries.filter((d) => {
    const matchesSearch = d.customerName.toLowerCase().includes(search.toLowerCase()) || d.note.toLowerCase().includes(search.toLowerCase())
    const matchesIntent = intentFilter === "all" || d.intent === intentFilter
    return matchesSearch && matchesIntent
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              className="w-full rounded-lg border border-border-light py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Search customer or note..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-2 text-sm text-text-secondary hover:bg-brand-400/10"
            >
              <Filter size={16} />
              <ChevronDown size={14} />
            </button>
            {showFilter && (
              <div className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-border-light bg-white shadow-lg z-10">
                {INTENT_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setIntentFilter(f); setPage(0); setShowFilter(false) }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-brand-400/10 ${
                      intentFilter === f ? "font-semibold text-brand-900" : "text-text-secondary"
                    }`}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-border-light px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-400/10 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded-lg border border-border-light px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-400/10 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      <div className="space-y-px overflow-hidden rounded-xl border border-border-light bg-border-light">
        {paginated.map((d) => (
          <DeliveryStatusItem key={d.id} delivery={d} />
        ))}
        {paginated.length === 0 && (
          <div className="bg-white px-5 py-8 text-center text-sm text-text-secondary">
            No results found
          </div>
        )}
      </div>
    </div>
  )
}
