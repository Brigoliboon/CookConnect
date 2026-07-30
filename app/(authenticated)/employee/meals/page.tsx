"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button, WeeklyMenu, MealGallery, NewMealDialog } from "@/components/ui"
import { MENU_CATEGORIES } from "@/constants"
import type { MenuCategory, MenuItem, WeeklyMenu as WeeklyMenuType } from "@/constants"
import { CalendarDays, Plus } from "lucide-react"

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

export default function EmployeeMealsPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [createdMenus, setCreatedMenus] = useState<WeeklyMenuType[]>([])
  const [showNewMeal, setShowNewMeal] = useState(false)

  useEffect(() => {
    fetch("/api/recipe")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
        return data as Record<string, unknown>[]
      })
      .then((data) => {
        console.log("[MEALS] API response:", data)
        const items: MenuItem[] = data.map((r: Record<string, unknown>) => {
          const n = r.nutrition as Record<string, unknown> | null
          return {
            id: r.id as string,
            name: r.name as string,
            category: (r.category as MenuCategory) ?? "chicken",
            description: (r.description as string) ?? "",
            price: (r.price as number) ?? 0,
            calories: (r.calories as number) ?? 0,
            protein: (n?.protein_g as number) ?? 0,
            carbs: (n?.carbs_g as number) ?? 0,
            fats: (n?.fats_g as number) ?? 0,
            fiber: (n?.fiber_g as number) ?? 0,
            sugar: (n?.sugar_g as number) ?? 0,
            sodium: (n?.sodium_mg as number) ?? 0,
            image_path: (r.image_path as string) ?? null,
            ingredients: ((r.ingredients as { name: string }[]) ?? []).map((i) => i.name),
          }
        })
        setMenuItems(items)
      })
      .catch((e) => console.error("[MEALS] Failed to fetch recipes:", e.message || e))
  }, [])

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-brand-900">All Meals</h2>
          <Button onClick={() => setShowNewMeal(true)}>
            <Plus size={16} className="mr-1" />
            New Meal
          </Button>
          <NewMealDialog open={showNewMeal} onClose={() => setShowNewMeal(false)} />
        </div>
        <MealGallery items={menuItems} categories={MENU_CATEGORIES} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <WeeklyMenu data={{ weekOf: "", items: { chicken: [], beef: [], seafood: [], salad: [], wrap: [], breakfast: [], pasta: [], soup: [] } }} />
      </motion.div>

      <motion.div variants={itemVariants}>
        {createdMenus.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-brand-900">Previous Menus</h2>
            {createdMenus.map((menu, i) => (
              <div key={i} className="rounded-xl border border-border-light bg-white p-5">
                <p className="mb-4 text-base font-semibold text-brand-900">{menu.weekOf}</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {(Object.keys(menu.items) as MenuCategory[]).map((cat) => (
                    <div key={cat}>
                      <p className="text-[11px] font-semibold uppercase text-text-secondary">{MENU_CATEGORIES.find((c) => c.value === cat)?.label ?? cat}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {menu.items[cat].map((m) => (
                          <span key={m.id} className="rounded bg-brand-400/10 px-2 py-0.5 text-xs text-brand-900">{m.name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-text-secondary">
            <CalendarDays size={40} className="opacity-30" />
            <p className="text-sm">No previous menus.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
