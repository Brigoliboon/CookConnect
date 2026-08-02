"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MapboxMap } from "@/components/ui/MapboxMap"
import { CUSTOMERS, SUBSCRIPTIONS, DELIVERIES } from "@/constants"
import { Package, Truck, Users, UserPlus, ClipboardList, Receipt, LayoutDashboard, type LucideIcon } from "lucide-react"
import { StatCard, StatusGallery, WeeklyMenu, QuickActionCard } from "@/components/ui"
import { PopularMealsChart, CarbPreferenceChart, RestrictionsChart, GoalsChart } from "@/components/charts"

type MapFilter = "all" | "today" | "skip"

const quickActions = [
  { label: "New Subscription", href: "/employee/subscriptions/", icon: Package, from: "#059669", to: "#047857" },
  { label: "Deliveries", href: "/employee/deliveries", icon: Truck, from: "#2563eb", to: "#1d4ed8" },
  { label: "Create Account", href: "/employee/accounts", icon: UserPlus, from: "#7c3aed", to: "#6d28d9" },
  { label: "Customers", href: "/employee/customers", icon: Users, from: "#d97706", to: "#b45309" },
]

const FILTERS: { label: string; value: MapFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Skip", value: "skip" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export default function EmployeeDashboardPage() {
  const [mapFilter, setMapFilter] = useState<MapFilter>("all")
  const [activeOrders, setActiveOrders] = useState(0)

  useEffect(() => {
    fetch("/api/orders")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch orders")
        return data as { status: string }[]
      })
      .then((orders) => {
        setActiveOrders(orders.filter((o) => !["cancelled", "delivered"].includes(o.status)).length)
      })
      .catch((e) => console.error("[DASHBOARD] Orders fetch error:", e.message || e))
  }, [])

  const mapMarkers = DELIVERIES
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
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-500">Overview of your restaurant operations</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users as LucideIcon} label="Total Customers" value={CUSTOMERS.length} />
          <StatCard icon={ClipboardList as LucideIcon} label="Active Subscriptions" value={SUBSCRIPTIONS.length} />
          <StatCard icon={Truck as LucideIcon} label="Delivering Today" value={DELIVERIES.filter((d) => d.intent === "today").length} />
          <StatCard icon={Receipt as LucideIcon} label="Active Orders" value={activeOrders} />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Delivery Map</h2>
            <div className="flex items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setMapFilter(f.value)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    mapFilter === f.value
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 backdrop-blur-sm shadow-sm">
            <MapboxMap markers={mapMarkers} height="full" defaultStyle="satellite" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          <PopularMealsChart subscriptions={SUBSCRIPTIONS} />
          <CarbPreferenceChart subscriptions={SUBSCRIPTIONS} />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <GoalsChart subscriptions={SUBSCRIPTIONS} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <RestrictionsChart subscriptions={SUBSCRIPTIONS} />
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.href} {...action} />
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <WeeklyMenu data={{ weekOf: "", items: { chicken: [], beef: [], seafood: [], salad: [], wrap: [], breakfast: [], pasta: [], soup: [] } }} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Today&apos;s Status</h2>
        <StatusGallery deliveries={DELIVERIES} />
      </motion.div>
    </motion.div>
  )
}
