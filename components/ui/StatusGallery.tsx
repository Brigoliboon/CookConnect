"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"
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
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              className="w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-2.5 pl-10 text-sm text-neutral-900 outline-none backdrop-blur-sm placeholder:text-neutral-400 focus:border-neutral-400"
              placeholder="Search customer or note..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white/80 px-4 py-2.5 text-sm text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400"
            >
              <ChevronDown size={14} className={`transition-transform ${showFilter ? "rotate-180" : ""}`} />
            </button>
            {showFilter && (
              <div className="absolute left-0 top-full mt-2 w-36 rounded-xl border border-neutral-200 bg-white py-1.5 shadow-lg z-10">
                {INTENT_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setIntentFilter(f); setPage(0); setShowFilter(false) }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-neutral-100 ${
                      intentFilter === f ? "font-semibold text-neutral-900" : "text-neutral-500"
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
            className="rounded-xl border border-neutral-200 bg-white/80 px-4 py-2 text-xs font-semibold text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-neutral-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded-xl border border-neutral-200 bg-white/80 px-4 py-2 text-xs font-semibold text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {paginated.map((d, i) => (
          <DeliveryStatusItem key={d.id} delivery={d} index={i} />
        ))}
        {paginated.length === 0 && (
          <div className="rounded-2xl border border-neutral-200/60 bg-white/80 px-5 py-12 text-center text-sm text-neutral-500 backdrop-blur-sm">
            No results found
          </div>
        )}
      </div>
    </div>
  )
}
