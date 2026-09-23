"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MapboxMap } from "@/components/ui/MapboxMap"
import { SUBSCRIPTIONS } from "@/constants"
import { Package, Truck, UserPlus, ClipboardList, Receipt, LayoutDashboard, ChefHat, type LucideIcon } from "lucide-react"
import { StatCard, WeeklyMenu, QuickActionCard } from "@/components/ui"
import { PopularMealsChart, CarbPreferenceChart, RestrictionsChart, GoalsChart } from "@/components/charts"

const quickActions = [
  { label: "New Subscription", href: "/employee/subscriptions/", icon: Package, from: "#059669", to: "#047857" },
  { label: "Deliveries", href: "/employee/deliveries", icon: Truck, from: "#2563eb", to: "#1d4ed8" },
  { label: "Create Account", href: "/employee/accounts", icon: UserPlus, from: "#7c3aed", to: "#6d28d9" },
  { label: "Chef", href: "/employee/chef", icon: ChefHat, from: "#d97706", to: "#b45309" },
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

interface DashboardOrder {
  id: string
  name: string
  status: string
  location: unknown
}

function parseOrderLocation(location: unknown): { lat: number; lng: number } | null {
  if (!location) return null
  if (typeof location === "object") {
    const o = location as { lat?: number; lng?: number; coordinates?: [number, number] }
    if (typeof o.lat === "number" && typeof o.lng === "number") return { lat: o.lat, lng: o.lng }
    if (Array.isArray(o.coordinates)) return { lng: o.coordinates[0], lat: o.coordinates[1] }
    return null
  }
  if (typeof location !== "string") return null
  try {
    const bytes = new Uint8Array(location.match(/../g)!.map((b) => parseInt(b, 16)))
    const view = new DataView(bytes.buffer)
    const offset = bytes.length - 16
    return { lng: view.getFloat64(offset, true), lat: view.getFloat64(offset + 8, true) }
  } catch {
    return null
  }
}

export default function EmployeeDashboardPage() {
  const [activeOrders, setActiveOrders] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [orders, setOrders] = useState<DashboardOrder[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch orders")
        return data as DashboardOrder[]
      }),
      fetch("/api/orders?status=confirmed&location_only=true").then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch map orders")
        return data as DashboardOrder[]
      }),
    ])
      .then(([all, located]) => {
        setOrders(located)
        setActiveOrders(all.filter((o) => !["cancelled", "delivered"].includes(o.status)).length)
        setPendingOrders(all.filter((o) => o.status === "inquiry").length)
      })
      .catch((e) => console.error("[DASHBOARD] Orders fetch error:", e.message || e))
  }, [])

  const mapMarkers = orders
    .map((o) => ({ order: o, coords: parseOrderLocation(o.location) }))
    .filter((o): o is { order: DashboardOrder; coords: { lat: number; lng: number } } => o.coords !== null)
    .map(({ order, coords }) => ({
      id: order.id,
      lat: coords.lat,
      lng: coords.lng,
      label: `${order.name} — ${order.status.replaceAll("_", " ")}`,
      type: "orders",
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
          <StatCard icon={Package as LucideIcon} label="Pending Orders" value={pendingOrders} />
          <StatCard icon={ClipboardList as LucideIcon} label="Active Subscriptions" value={SUBSCRIPTIONS.length} />
          <StatCard icon={Truck as LucideIcon} label="Confirmed Orders" value={orders.filter((o) => o.status === "confirmed").length} />
          <StatCard icon={Receipt as LucideIcon} label="Active Orders" value={activeOrders} />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.href} {...action} />
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Delivery Map</h2>
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
        <WeeklyMenu data={{ weekOf: "", items: { chicken: [], beef: [], seafood: [], salad: [], wrap: [], breakfast: [], pasta: [], soup: [], pizza: [], burgers: [], drinks: [], biryani: [], risotto: [], smoothie: [], juice: [], beverages: [], desserts: [], "rice-sides": [], platters: [], vegetable: [] } }} />
      </motion.div>

    </motion.div>
  )
}
