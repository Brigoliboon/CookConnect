"use client"

import { useState, useMemo, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RiderMap } from "@/components/ui"
import { Button } from "@/components/ui"
import { DELIVERIES, RIDERS } from "@/constants"
import type { DeliveryIntent } from "@/constants"
import { Bike, CheckCircle, Clock, XCircle, GripHorizontal, Navigation } from "lucide-react"

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

type DeliveryTab = "all" | DeliveryIntent

const TABS: { label: string; value: DeliveryTab }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "today" },
  { label: "Delivered", value: "delivered" },
]

export default function RiderDashboardPage() {
  const rider = RIDERS[0]
  const [deliveries, setDeliveries] = useState(
    DELIVERIES.filter((d) => d.riderId === rider.id)
  )
  const [showPanel, setShowPanel] = useState(true)
  const [activeTab, setActiveTab] = useState<DeliveryTab>("all")
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startY: 0, startHeight: 320 })
  const [panelHeight, setPanelHeight] = useState(320)

  const stats = useMemo(() => {
    const today = deliveries.filter((d) => d.intent === "today").length
    const delivered = deliveries.filter((d) => d.intent === "delivered").length
    const skipped = deliveries.filter((d) => d.intent === "skip").length
    return { today, delivered, skip: skipped }
  }, [deliveries])

  const filtered = activeTab === "all"
    ? deliveries
    : deliveries.filter((d) => d.intent === activeTab)

  function updateIntent(id: string, intent: DeliveryIntent) {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, intent } : d))
    )
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
        deliveries={deliveries}
        onUpdateIntent={updateIntent}
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

            <div className="flex items-center gap-3 px-5 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-white">
                  <Bike size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-900">{rider.name}</p>
                  <p className="text-[11px] text-text-secondary">{stats.today} pending · {stats.delivered} done</p>
                </div>
              </div>
            </div>

            <div className="flex gap-1 px-5 pb-3 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.value
                      ? "bg-brand-900 text-white"
                      : "bg-brand-400/10 text-text-secondary hover:bg-brand-400/20"
                  }`}
                >
                  {tab.label}
                  {tab.value !== "all" && (
                    <span className="ml-1 opacity-70">({stats[tab.value]})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div className="divide-y divide-border-light rounded-xl border border-border-light">
                {filtered.map((d) => {
                  const Icon = INTENT_ICONS[d.intent]
                  return (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-brand-900">{d.customerName}</p>
                        <p className="flex items-center gap-1 text-xs text-text-secondary">
                          <Navigation size={11} />
                          {d.customerAddress}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${INTENT_COLORS[d.intent]}`}>
                          <Icon size={12} />
                          <span className="capitalize">{d.intent}</span>
                        </span>
                        <Button
                          size="sm"
                          variant={d.intent === "delivered" ? "primary" : "outline"}
                          className="text-xs !px-2 !py-0.5"
                          onClick={() => updateIntent(d.id, "delivered")}
                        >
                          Done
                        </Button>
                        <Button
                          size="sm"
                          variant={d.intent === "skip" ? "danger" : "outline"}
                          className="text-xs !px-2 !py-0.5"
                          onClick={() => updateIntent(d.id, "skip")}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && (
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
