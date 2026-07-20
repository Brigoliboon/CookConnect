"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MapboxMap } from "@/components/ui/MapboxMap"
import Link from "next/link"
import { CUSTOMERS, SUBSCRIPTIONS, DELIVERIES } from "@/constants"
import { Package, Truck, Users, UserPlus, ClipboardList, UserCheck, type LucideIcon } from "lucide-react"
import { StatCard, StatusGallery } from "@/components/ui"

type MapFilter = "all" | "today" | "skip"

const quickActions = [
  { label: "New Subscription", href: "/employee/subscriptions/", icon: Package },
  { label: "Deliveries", href: "/employee/deliveries", icon: Truck },
  { label: "Create Account", href: "/employee/accounts", icon: UserPlus },
  { label: "Customers", href: "/employee/customers", icon: Users },
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
      <motion.div variants={itemVariants} className="rounded-xl border border-border-light bg-white p-5">
        <p className="text-xs font-semibold text-text-secondary tracking-widest uppercase">Overview</p>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users as LucideIcon} label="Total Customers" value={CUSTOMERS.length} />
          <StatCard icon={ClipboardList as LucideIcon} label="Active Subscriptions" value={SUBSCRIPTIONS.length} />
          <StatCard icon={Truck as LucideIcon} label="Delivering Today" value={DELIVERIES.filter((d) => d.intent === "today").length} />
          <StatCard icon={UserCheck as LucideIcon} label="Available Riders" value={3} />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-900">Delivery Map</h2>
          <div className="flex items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setMapFilter(f.value)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  mapFilter === f.value
                    ? "bg-brand-900 text-white"
                    : "bg-white text-text-secondary border border-border-light hover:bg-brand-400/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <MapboxMap markers={mapMarkers} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-xl bg-brand-900 px-5 py-5 text-sm font-semibold text-white transition-all hover:bg-brand-900/90"
              >
                <Icon size={22} />
                {action.label}
              </Link>
            )
          })}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-brand-900 mb-4">Today&apos;s Status</h2>
        <StatusGallery deliveries={DELIVERIES} />
      </motion.div>
    </motion.div>
  )
}
