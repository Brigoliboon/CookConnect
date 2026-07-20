"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { LocationDialog } from "@/components/ui"
import { CUSTOMERS, SUBSCRIPTIONS, DELIVERIES } from "@/constants"
import { Home, Utensils, Users, Apple, CalendarDays, ClipboardList, CheckCircle, Clock, XCircle, MapPin } from "lucide-react"
import type { DeliveryIntent } from "@/constants"

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

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function CustomerDashboardPage() {
  const customer = CUSTOMERS[0]
  const [location, setLocation] = useState(customer.location)
  const [showMap, setShowMap] = useState(false)
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const subscription = SUBSCRIPTIONS.find((s) => s.customerId === customer.id)
  const detail = subscription?.details as Record<string, unknown> | undefined
  const deliveries = DELIVERIES.filter((d) => d.customerId === customer.id)

  const stats = {
    today: deliveries.filter((d) => d.intent === "today").length,
    delivered: deliveries.filter((d) => d.intent === "delivered").length,
  }

  return (
    <div className="space-y-6">
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-900 text-white">
          <Home size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Welcome, {customer.name}</h1>
          <p className="text-sm text-text-secondary">Here is your subscription overview.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Upcoming", value: stats.today, icon: Clock, color: "text-blue-600" },
          { label: "Delivered", value: stats.delivered, icon: CheckCircle, color: "text-brand-900" },
        ].map((s) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            className="flex items-center gap-3 rounded-xl border border-border-light p-4 shadow-sm"
          >
            <s.icon size={22} className={s.color} />
            <div>
              <p className="text-2xl font-bold text-brand-900">{s.value}</p>
              <p className="text-xs text-text-secondary">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} className="relative h-44 overflow-hidden rounded-xl border border-border-light shadow-sm">
        <img
          src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+118B50(${location.lng},${location.lat})/${location.lng},${location.lat},10/600x200@2x?access_token=${mapToken}`}
          alt="Your location"
          className="h-full w-full object-cover"
        />
        <button
          onClick={() => setShowMap(true)}
          className="absolute bottom-2 right-2 z-10 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-brand-900 shadow-sm backdrop-blur-sm hover:bg-white"
        >
          <MapPin size={12} className="inline" />
          Change Location
        </button>
      </motion.div>

      {subscription && detail && (
        <motion.div variants={fadeUp} className="rounded-xl border border-border-light p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-brand-900">
            <ClipboardList size={18} />
            Your Meal Plan
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-lg bg-brand-400/10 px-4 py-3">
              <CalendarDays size={18} className="text-brand-900" />
              <div>
                <p className="text-xs text-text-secondary">Meals per Week</p>
                <p className="font-semibold text-brand-900">{String(detail.mealsPerWeek)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-brand-400/10 px-4 py-3">
              <Users size={18} className="text-brand-900" />
              <div>
                <p className="text-xs text-text-secondary">Servings</p>
                <p className="font-semibold text-brand-900">{String(detail.servingsPerMeal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-brand-400/10 px-4 py-3">
              <Apple size={18} className="text-brand-900" />
              <div>
                <p className="text-xs text-text-secondary">Diet</p>
                <p className="font-semibold text-brand-900 capitalize">{String(detail.dietaryPreference)}</p>
              </div>
            </div>
          </div>
          {Array.isArray(detail.includedMeals) && (detail.includedMeals as string[]).length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-text-secondary">Included Meals</p>
              <div className="flex flex-wrap gap-1.5">
                {(detail.includedMeals as string[]).map((meal) => (
                  <span key={meal} className="rounded-full bg-brand-400/10 px-3 py-0.5 text-xs font-medium text-brand-900">
                    {meal}
                  </span>
                ))}
              </div>
            </div>
          )}
          {String(detail.notes) && (
            <p className="mt-3 text-xs italic text-text-secondary">📝 {String(detail.notes)}</p>
          )}
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-brand-900">
          <Utensils size={18} />
          Recent Deliveries
        </h2>
        <div className="divide-y divide-border-light rounded-xl border border-border-light shadow-sm">
          {deliveries.slice(0, 5).map((d) => {
            const Icon = INTENT_ICONS[d.intent]
            return (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-brand-900">{d.date}</p>
                  <p className="text-xs text-text-secondary">{d.customerAddress}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${INTENT_COLORS[d.intent]}`}>
                  <Icon size={14} />
                  <span className="capitalize">{d.intent}</span>
                </span>
              </div>
            )
          })}
          {deliveries.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-text-secondary">No deliveries yet.</p>
          )}
        </div>
      </motion.div>

      <LocationDialog
        open={showMap}
        onClose={() => setShowMap(false)}
        lat={location.lat}
        lng={location.lng}
        onSave={(lat, lng) => setLocation({ lat, lng })}
      />
    </div>
  )
}
