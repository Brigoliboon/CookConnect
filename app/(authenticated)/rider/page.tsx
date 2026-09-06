"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RiderMap } from "@/components/ui"
import type { Delivery, DeliveryIntent } from "@/constants"
import type { Order } from "@/lib/supabase/models"
import { parseOrderLocation } from "@/lib/orders/location"
import { useAuth } from "@/hooks/AuthProvider"
import { GripHorizontal, MapPin, Plus, Check } from "lucide-react"

type DeliveryTab = "active" | "mine"

const TABS: { label: string; value: DeliveryTab }[] = [
  { label: "My Deliveries", value: "mine" },
  { label: "Open Orders", value: "active" },
]

export default function RiderDashboardPage() {
  const { user } = useAuth()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(true)
  const [activeTab, setActiveTab] = useState<DeliveryTab>("active")
  const [takenIds, setTakenIds] = useState<string[]>([])
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; key: number } | null>(null)

  function toDelivery(order: Order): Delivery | null {
    const coords = parseOrderLocation(order.location)
    if (!coords) return null
    return {
      id: order.id,
      customerId: order.customer_id ?? "",
      customerName: order.name,
      customerAddress: order.address ?? "",
      riderId: null,
      riderName: null,
      subscriptionId: "",
      intent: "today" as DeliveryIntent,
      note: "",
      location: { lat: coords.lat, lng: coords.lng, address: order.address ?? "" },
      date: (order.created_at ?? "").split("T")[0],
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/orders?status=ready_for_pickup").then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch open orders")
        return data as Order[]
      }),
      fetch("/api/deliveries/mine").then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch my deliveries")
        return data as { assignment: { order_id: string }; order: Order }[]
      }).catch((e) => {
        console.error("[RIDER] My deliveries fetch error:", e.message || e)
        return [] as { assignment: { order_id: string }; order: Order }[]
      }),
    ])
      .then(([openOrders, mine]) => {
        const mineDeliveries = mine
          .map((r) => toDelivery(r.order))
          .filter((d): d is Delivery => d !== null)
        const seen = new Set(mineDeliveries.map((d) => d.id))
        const openDeliveries = openOrders
          .map(toDelivery)
          .filter((d): d is Delivery => d !== null && !seen.has(d.id))
        setDeliveries([...mineDeliveries, ...openDeliveries])
        setTakenIds(mine.map((r) => r.assignment.order_id))
      })
      .catch((e) => console.error("[RIDER] Open orders fetch error:", e.message || e))
      .finally(() => setLoading(false))
  }, [])
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startY: 0, startHeight: 320 })
  const [panelHeight, setPanelHeight] = useState(320)

  const activeDeliveries = useMemo(
    () => deliveries.filter((d) => d.intent === "today" && !takenIds.includes(d.id)),
    [deliveries, takenIds],
  )
  const myDeliveries = useMemo(
    () => deliveries.filter((d) => takenIds.includes(d.id)),
    [deliveries, takenIds],
  )

  const counts: Record<DeliveryTab, number> = {
    active: activeDeliveries.length,
    mine: myDeliveries.length,
  }

  const filtered = activeTab === "active" ? activeDeliveries : myDeliveries

  function updateIntent(id: string, intent: DeliveryIntent) {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, intent } : d))
    )
  }

  async function takeDelivery(id: string) {
    if (!user) {
      console.error("[RIDER] Take failed: not logged in")
      return
    }
    try {
      const res = await fetch(`/api/orders/${id}/assign`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 409) {
          setDeliveries((prev) => prev.filter((d) => d.id !== id))
          setTakenIds((prev) => prev.filter((t) => t !== id))
        }
        console.error("[RIDER] Take failed:", err.error)
        return
      }
      setTakenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    } catch (e) {
      console.error("[RIDER] Take error:", e)
    }
  }

  async function completeOrder(id: string) {
    try {
      const res = await fetch(`/api/orders/${id}/assign`, { method: "PATCH" })
      if (!res.ok) {
        const err = await res.json()
        console.error("[RIDER] Complete failed:", err.error)
        return
      }
      updateIntent(id, "delivered")
    } catch (e) {
      console.error("[RIDER] Complete error:", e)
    }
  }

  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    dragRef.current = { startY: clientY, startHeight: panelHeight }

    function onMove(ev: MouseEvent | TouchEvent) {
      const y = "touches" in ev ? ev.touches[0].clientY : ev.clientY
      const delta = dragRef.current.startY - y
      setPanelHeight(Math.max(120, Math.min(600, dragRef.current.startHeight + delta)))
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onUp)
      if (panelRef.current && panelRef.current.getBoundingClientRect().height < 150) {
        setShowPanel(false)
      }
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    document.addEventListener("touchmove", onMove)
    document.addEventListener("touchend", onUp)
  }, [panelHeight])

  return (
    <div className="relative -m-6 h-[calc(100vh-64px)] lg:h-[calc(100vh-56px)] overflow-hidden">
      <RiderMap
        deliveries={filtered}
        onUpdateIntent={updateIntent}
        focusRequest={mapFocus}
      />

      <AnimatePresence>
        {showPanel && (
          <motion.div
            ref={panelRef}
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ height: panelHeight }}
            className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl bg-white shadow-2xl"
          >
            <div
              className="flex cursor-grab active:cursor-grabbing flex-col items-center pt-2 pb-1"
              onMouseDown={startDrag}
              onTouchStart={startDrag}
            >
              <GripHorizontal size={20} className="text-text-secondary" />
            </div>

            <div className="flex items-center gap-2 px-5 pb-3">
              <div className="flex flex-1 rounded-xl bg-neutral-900 p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeTab === tab.value
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {tab.label} ({counts[tab.value]})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div className="space-y-2">
                {loading && (
                  <p className="px-3 py-6 text-center text-sm text-text-secondary">Loading open orders…</p>
                )}
                {!loading && filtered.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-neutral-900">{d.customerName}</p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">{d.customerAddress}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {d.location && (
                        <button
                          onClick={() => setMapFocus({ lat: d.location!.lat, lng: d.location!.lng, key: Date.now() })}
                          aria-label="Focus on map"
                          className="flex size-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-colors hover:bg-neutral-100"
                        >
                          <MapPin size={18} />
                        </button>
                      )}
                      {activeTab === "active" ? (
                        <button
                          onClick={() => takeDelivery(d.id)}
                          aria-label="Take delivery"
                          className="flex size-11 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-700"
                        >
                          <Plus size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => completeOrder(d.id)}
                          aria-label="Mark delivered"
                          className={`flex size-11 items-center justify-center rounded-full transition-colors ${d.intent === "delivered" ? "bg-neutral-200 text-neutral-400" : "bg-neutral-900 text-white hover:bg-neutral-700"}`}
                        >
                          <Check size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && filtered.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-text-secondary">No deliveries found.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-brand-900 px-5 py-2 text-sm font-medium text-white shadow-lg"
        >
          Show Deliveries ({deliveries.length})
        </button>
      )}
    </div>
  )
}
