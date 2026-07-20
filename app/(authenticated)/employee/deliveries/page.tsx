"use client"

import { useState } from "react"
import { Table } from "@/components/ui/Table"
import { MapboxMap } from "@/components/ui/MapboxMap"
import { DELIVERIES, RIDERS, DELIVERY_INTENT_OPTIONS } from "@/constants"
import type { Delivery, DeliveryIntent } from "@/constants"
import { Truck, MapPin, CheckCircle, Clock, XCircle } from "lucide-react"

type MapFilter = "all" | "today" | "skip"

const FILTERS: { label: string; value: MapFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Skip", value: "skip" },
]

const INTENT_ICONS: Record<DeliveryIntent, typeof CheckCircle> = {
  today: Clock,
  skip: XCircle,
  delivered: CheckCircle,
}

const INTENT_COLORS: Record<DeliveryIntent, string> = {
  today: "text-blue-600",
  skip: "text-red-500",
  delivered: "text-brand-900",
}

export default function EmployeeDeliveriesPage() {
  const [mapFilter, setMapFilter] = useState<MapFilter>("today")
  const [deliveries, setDeliveries] = useState(DELIVERIES)

  function updateIntent(id: string, intent: DeliveryIntent) {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, intent } : d))
    )
  }

  function updateNote(id: string, note: string) {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, note } : d))
    )
  }

  function assignRider(id: string, riderId: string) {
    const rider = riderId
      ? RIDERS.find((r) => r.id === riderId)?.name ?? null
      : null
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, riderId: riderId || null, riderName: rider } : d))
    )
  }

  const mapMarkers = deliveries
    .filter((d) => {
      if (mapFilter === "all") return true
      return d.intent === mapFilter
    })
    .filter((d) => d.location)
    .map((d) => ({
      id: d.id,
      lat: d.location!.lat,
      lng: d.location!.lng,
      label: `${d.customerName} — ${d.intent}${d.note ? `: ${d.note}` : ""}`,
      type: d.intent,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-brand-900">
          <Truck size={24} />
          Deliveries
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track daily delivery statuses, assign riders, and manage customer intent.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setMapFilter(f.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                mapFilter === f.value
                  ? "bg-brand-900 text-white"
                  : "bg-white text-text-secondary border border-border-light hover:bg-brand-400/10"
              }`}
            >
              <MapPin size={14} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <MapboxMap markers={mapMarkers} className="h-80 w-full" />

      <Table<Delivery>
        columns={[
          { key: "customerName", header: "Customer" },
          { key: "customerAddress", header: "Address" },
          {
            key: "intent",
            header: "Intent",
            render: (row) => {
              const Icon = INTENT_ICONS[row.intent]
              return (
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${INTENT_COLORS[row.intent]}`}>
                  <Icon size={15} />
                  <span className="capitalize">{row.intent}</span>
                </span>
              )
            },
          },
          {
            key: "intent-edit",
            header: "Change Intent",
            render: (row) => (
              <select
                className="rounded border border-border px-2 py-1 text-sm"
                value={row.intent}
                onChange={(e) => updateIntent(row.id, e.target.value as DeliveryIntent)}
                onClick={(e) => e.stopPropagation()}
              >
                {DELIVERY_INTENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ),
          },
          {
            key: "note",
            header: "Note",
            render: (row) => (
              <input
                className="w-full rounded border border-border px-2 py-1 text-sm"
                value={row.note}
                onChange={(e) => updateNote(row.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Customer note..."
              />
            ),
          },
          {
            key: "riderName",
            header: "Rider",
            render: (row) => (
              <select
                className="rounded border border-border px-2 py-1 text-sm"
                value={row.riderId ?? ""}
                onChange={(e) => assignRider(row.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Unassigned</option>
                {RIDERS.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ),
          },
        ]}
        data={deliveries}
      />
    </div>
  )
}
