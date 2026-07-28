"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { CUSTOMERS, SUBSCRIPTIONS, DELIVERIES } from "@/constants"
import { RIDERS } from "@/constants/deliveries"
import { Utensils, Users, CalendarDays, ClipboardList, CheckCircle, Clock, XCircle, Target, Carrot, Ban, RefreshCw, Truck, Flame, Navigation } from "lucide-react"
import { MEAL_TIMES, CARB_OPTIONS, ROTATION_MODES, GOAL_MODIFICATIONS } from "@/constants"
import type { DeliveryIntent } from "@/constants"
import { getMenuByCategory, type MenuCategory } from "@/constants/menu"
import { GalleryCard } from "@/components/landing/GalleryCard"

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

const GOAL_CALORIES: Record<string, number> = {
  balanced: 2000,
  "weight-loss": 1500,
  "high-protein": 2200,
  vegetarian: 1800,
  customized: 2000,
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function CustomerDashboardPage() {
  const customer = CUSTOMERS[0]
  const subscription = SUBSCRIPTIONS.find((s) => s.customerId === customer.id)
  const detail = subscription?.details as Record<string, unknown> | undefined
  const deliveries = DELIVERIES.filter((d) => d.customerId === customer.id)

  const allMeals = useMemo(() => {
    const categories: MenuCategory[] = ["chicken", "beef", "seafood", "salad", "wrap", "breakfast", "pasta", "soup"]
    return categories.flatMap((cat) => getMenuByCategory(cat))
  }, [])

  const avgMealCalories = useMemo(() => {
    if (allMeals.length === 0) return 400
    return Math.round(allMeals.reduce((s, m) => s + m.calories, 0) / allMeals.length)
  }, [allMeals])

  const goalKey = String(detail?.goal ?? "balanced")
  const dailyTarget = detail?.goal === "customized" && (detail as Record<string, unknown>).customGoal
    ? Number((detail as Record<string, unknown>).customGoal) || GOAL_CALORIES[goalKey]
    : GOAL_CALORIES[goalKey] || 2000

  const servingsPerMeal = Number(detail?.servingsPerMeal ?? 1)
  const mealTimes = (detail?.mealTimes as string[]) ?? []
  const mealsToday = mealTimes.length || 3
  const todayCalories = Math.min(mealsToday * avgMealCalories, dailyTarget)
  const spareCalories = dailyTarget - mealsToday * avgMealCalories

  const gaugeData = [
    { name: "Consumed", value: todayCalories },
    { name: "Remaining", value: Math.max(dailyTarget - todayCalories, 0) },
  ]

  const upcomingDelivery = deliveries.find((d) => d.intent === "today")
  const rider = upcomingDelivery
    ? RIDERS.find((r) => r.id === upcomingDelivery.riderId)
    : null
  const includedMeals = (detail?.includedMeals as string[]) ?? []

  const mealLookup = useMemo(() => {
    const map = new Map<string, (typeof allMeals)[0]>()
    for (const m of allMeals) map.set(m.name, m)
    return map
  }, [allMeals])

  return (
    <div className="space-y-8 py-8">
      {/* Calorie Gauge */}
      {detail && (
        <motion.div variants={fadeUp} className="border-y border-black/5 px-2 py-8">
          <div className="text-center">
            <span className="font-nunito inline-flex items-center gap-2 text-3xl font-extrabold text-black">
              <Flame size={28} className="text-orange-500" />
              {dailyTarget.toLocaleString()} kcal
            </span>
            <p className="font-nunito mt-1 text-xs text-black/30">Daily Calorie Target</p>
          </div>
          <div className="relative mx-auto mt-1 flex max-w-[280px] items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={72}
                  outerRadius={100}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#118B50" />
                  <Cell fill="#00000008" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute left-1/2 top-[62%] -translate-x-1/2 text-center">
              <p className="font-nunito text-4xl font-extrabold text-black">{todayCalories.toLocaleString()}</p>
              <p className="font-nunito text-xs text-black/30">kcal</p>
            </div>
          </div>
          <p className="font-nunito mt-2 text-center text-sm font-bold text-black/70">
            {spareCalories >= 0
              ? `You have ${spareCalories.toLocaleString()} calories to spare today!`
              : `You're ${Math.abs(spareCalories).toLocaleString()} calories over today's target!`}
          </p>
        </motion.div>
      )}

      {/* Upcoming Delivery */}
      {upcomingDelivery && rider && detail && (
        <motion.div variants={fadeUp} className="border-y border-black/5 px-2 py-8">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-brand-900" />
            <h2 className="font-nunito text-sm font-semibold text-black">Upcoming Delivery</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-4">
              <Clock size={20} className="text-brand-900" />
              <div>
                <p className="font-nunito text-xs text-black/30">Estimated Time</p>
                <p className="font-nunito text-lg font-bold text-black">{String(detail.deliveryTime ?? "—")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-900/10">
                <Users size={20} className="text-brand-900" />
              </div>
              <div>
                <p className="font-nunito text-xs text-black/30">Your Rider</p>
                <p className="font-nunito text-base font-bold text-black">{rider.name}</p>
              </div>
            </div>
            <a
              href="/rider"
              className="font-nunito inline-flex items-center gap-2 rounded-xl bg-brand-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-900/90"
            >
              <Navigation size={16} />
              Track Rider
            </a>
          </div>
        </motion.div>
      )}

      {/* Today's Meals */}
      {detail && (
        <motion.div variants={fadeUp} className="px-2">
          <h2 className="font-nunito mb-4 flex items-center gap-2 text-sm font-semibold text-black">
            <Utensils size={16} className="text-brand-900" />
            Today&apos;s Meals
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {includedMeals.map((meal: string, i: number) => {
              const item = mealLookup.get(meal)
              if (!item) return null
              const timeSlots = ["morning", undefined, "night"] as const
              return (
              <div key={meal} className="w-[241px]">
                <GalleryCard
                  name={item.name}
                  price={item.price}
                  calories={item.calories}
                  protein={item.protein}
                  carbs={item.carbs}
                  fats={item.fats}
                  description={item.description}
                  image={`https://picsum.photos/seed/${item.id}/400/280`}
                  variant="display"
                  timeSlot={timeSlots[i]}
                  className="h-[310px]"
                />
              </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Meal Plan */}
      {subscription && detail && (
        <motion.div variants={fadeUp} className="border-b border-black/5 px-2 pb-8">
          <h2 className="font-nunito flex items-center gap-2 text-sm font-semibold text-black">
            <ClipboardList size={16} className="text-brand-900" />
            Your Meal Plan
          </h2>
          <div className="mt-5 divide-y divide-black/5 border-y border-black/10">
            {[
              { icon: CalendarDays, label: "Meals / Week", value: String(detail.mealsPerWeek) },
              { icon: Users, label: "Servings", value: String(detail.servingsPerMeal) },
              { icon: Target, label: "Goal", value: String(detail.goal ?? "any"), capitalize: true },
              { icon: Carrot, label: "Carb", value: CARB_OPTIONS.find((c) => c.value === detail.preferredCarb)?.label ?? "—" },
              { icon: RefreshCw, label: "Rotation", value: ROTATION_MODES.find((r) => r.value === detail.rotationMode)?.label ?? "—" },
              { icon: Truck, label: "Delivery Time", value: String(detail.deliveryTime ?? "—") },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <row.icon size={15} className="text-brand-900" />
                  <span className="font-nunito text-sm text-black/50">{row.label}</span>
                </div>
                <span className={`font-nunito text-sm font-semibold text-black ${row.capitalize ? "capitalize" : ""}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="font-nunito mt-4 flex flex-wrap items-center gap-3 text-sm text-black/40">
            <p className="italic">{GOAL_MODIFICATIONS[detail.goal as keyof typeof GOAL_MODIFICATIONS] ?? ""}</p>
            {Array.isArray(detail.restrictions) && (detail.restrictions as string[]).length > 0 && (
              <span className="inline-flex items-center gap-1 text-red-500">
                <Ban size={13} />{(detail.restrictions as string[]).length} restriction{(detail.restrictions as string[]).length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {((detail.mealTimes as string[]) ?? []).map((t: string) => {
              const label = MEAL_TIMES.find((mt) => mt.value === t)?.label ?? t
              return (
                <span key={t} className="font-nunito rounded-full border border-brand-900/20 px-3 py-0.5 text-[11px] font-medium text-brand-900">
                  {label}
                </span>
              )
            })}
          </div>
          {Array.isArray(detail.includedMeals) && (detail.includedMeals as string[]).length > 0 && (
            <div className="mt-4">
              <p className="font-nunito text-[11px] font-semibold uppercase tracking-wider text-black/30">Included Meals</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(detail.includedMeals as string[]).map((meal) => (
                  <span key={meal} className="font-nunito rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black/60">
                    {meal}
                  </span>
                ))}
              </div>
            </div>
          )}
          {String(detail.notes) && (
            <p className="font-nunito mt-3 text-sm italic text-black/40">{String(detail.notes)}</p>
          )}
        </motion.div>
      )}

      {/* Recent Deliveries */}
      <motion.div variants={fadeUp} className="px-2 pb-8">
        <h2 className="font-nunito mb-4 flex items-center gap-2 text-sm font-semibold text-black">
          <Utensils size={16} className="text-brand-900" />
          Recent Deliveries
        </h2>
        <div className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/10">
          {deliveries.slice(0, 5).map((d) => {
            const Icon = INTENT_ICONS[d.intent]
            return (
              <div key={d.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-nunito text-sm font-semibold text-black">{d.date}</p>
                  <p className="font-nunito mt-0.5 text-xs text-black/40">{d.customerAddress}</p>
                </div>
                <span className={`font-nunito inline-flex items-center gap-1.5 text-sm font-semibold ${INTENT_COLORS[d.intent]}`}>
                  <Icon size={15} />
                  <span className="capitalize">{d.intent}</span>
                </span>
              </div>
            )
          })}
          {deliveries.length === 0 && (
            <p className="font-nunito px-5 py-8 text-center text-sm text-black/40">No deliveries yet.</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
