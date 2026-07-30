"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CalendarDays, ChefHat } from "lucide-react"
import type { MenuItem, WeeklyMenu as WeeklyMenuType } from "@/constants"
import { MealCard } from "./MealCard"
import { MealDetailDialog } from "./MealDetailDialog"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

function buildDailySchedule(data: WeeklyMenuType) {
  const allItems = Object.values(data.items).flat()
  const perDay = Math.ceil(allItems.length / DAYS.length)
  return DAYS.map((day, i) => ({
    day,
    items: allItems.slice(i * perDay, (i + 1) * perDay),
  }))
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
}

interface WeeklyMenuProps {
  data: WeeklyMenuType
}

export function WeeklyMenu({ data }: WeeklyMenuProps) {
  const [selectedDay, setSelectedDay] = useState(0)
  const [dialogItem, setDialogItem] = useState<MenuItem | null>(null)

  const schedule = useMemo(() => buildDailySchedule(data), [data])
  const currentDay = schedule[selectedDay]

  return (
    <div className="p-5">
      <div className="mb-5 flex items-center gap-2">
        <CalendarDays size={18} className="text-brand-900" />
        <h2 className="text-lg font-semibold text-brand-900">This Week&apos;s Menu</h2>
        <span className="ml-auto text-xs text-text-secondary">
          {data.weekOf}
        </span>
      </div>

      <nav className="-mx-5 mb-6 flex border-b border-border-light px-5">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`relative flex-1 px-3 py-2.5 text-center text-sm font-medium transition-colors ${
              selectedDay === i
                ? "text-brand-900"
                : "text-text-secondary hover:text-brand-900"
            }`}
          >
            {day}
            {selectedDay === i && (
              <motion.div
                layoutId="day-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-900"
              />
            )}
          </button>
        ))}
      </nav>

      <motion.div
        key={selectedDay}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="wait">
          {currentDay.items.length > 0 ? (
            currentDay.items.map((item) => (
              <MealCard
                key={item.id}
                item={item}
                onClick={() => setDialogItem(item)}
              />
            ))
          ) : (
            <motion.div
              key="empty"
              className="col-span-full flex flex-col items-center gap-2 py-12 text-text-secondary"
            >
              <ChefHat size={32} className="opacity-40" />
              <p className="text-sm">No menu items for this day.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <MealDetailDialog item={dialogItem} onClose={() => setDialogItem(null)} />
    </div>
  )
}
