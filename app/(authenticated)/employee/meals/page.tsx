"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button, WeeklyMenu, MealGallery, NewMealDialog, EditMealDialog } from "@/components/ui"
import { MENU_CATEGORIES } from "@/constants"
import type { MenuCategory, MenuItem, MealServingOption, WeeklyMenu as WeeklyMenuType } from "@/constants"
import { CalendarDays, Plus, UtensilsCrossed } from "lucide-react"

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
  const [editItem, setEditItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    fetch("/api/recipe?sort=name")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch recipes")
        return data.data as Record<string, unknown>[]
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
            ingredients: (r.ingredients as MenuItem["ingredients"]) ?? [],
            servings: ((r.servings as Record<string, unknown>[]) ?? [])
              .filter((s) => (s.is_active as boolean) !== false)
              .map((s): MealServingOption => ({
                id: s.id as string,
                name: (s.name as string | null) ?? null,
                price: (s.price as number | null) ?? null,
                calories: (s.calories as number | null) ?? null,
                nutrition: (s.nutrition as MealServingOption["nutrition"]) ?? null,
                is_active: (s.is_active as boolean) ?? true,
              })),
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
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Meals</h1>
            <p className="text-sm text-neutral-500">Manage your menu items and weekly meal plans</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">All Meals</h2>
          <Button onClick={() => { setEditItem(null); setShowNewMeal(true) }}>
            <Plus size={16} className="mr-1" />
            New Meal
          </Button>
          <NewMealDialog open={showNewMeal && !editItem} onClose={() => setShowNewMeal(false)} />
          {editItem && (
            <EditMealDialog open={!!editItem} onClose={() => { setEditItem(null); setShowNewMeal(false) }} item={editItem} />
          )}
        </div>
        <MealGallery items={menuItems} categories={MENU_CATEGORIES} onEdit={(item) => { setEditItem(item); setShowNewMeal(true) }} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <WeeklyMenu data={{ weekOf: "", items: { chicken: [], beef: [], seafood: [], salad: [], wrap: [], breakfast: [], pasta: [], soup: [], pizza: [], burgers: [], drinks: [], biryani: [], risotto: [], smoothie: [], juice: [], beverages: [], desserts: [], "rice-sides": [], platters: [], vegetable: [] } }} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Previous Menus</h2>
        {createdMenus.length > 0 ? (
          <div className="space-y-4">
            {createdMenus.map((menu, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="rounded-2xl border border-neutral-200/60 bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50"
              >
                <p className="mb-5 font-semibold text-neutral-900">{menu.weekOf}</p>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  {(Object.keys(menu.items) as MenuCategory[]).map((cat) => (
                    <div key={cat}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        {MENU_CATEGORIES.find((c) => c.value === cat)?.label ?? cat}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {menu.items[cat].map((m) => (
                          <span key={m.id} className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-neutral-200 py-20">
            <CalendarDays size={40} className="text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No previous menus.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
