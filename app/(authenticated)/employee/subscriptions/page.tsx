"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button, Input, Select, SubscriptionGallery } from "@/components/ui"
import { SUBSCRIPTIONS, CUSTOMERS } from "@/constants"
import type { Subscription } from "@/constants"
import { Plus, Apple, CheckSquare, ClipboardList, User, CalendarDays, ChefHat } from "lucide-react"

const MEAL_OPTIONS = [
  { label: "Any", value: "any" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "High Protein", value: "high-protein" },
  { label: "Low Carb", value: "low-carb" },
]

const INCLUDED_MEALS = [
  "Chicken Adobo",
  "Beef Sinigang",
  "Pork Sisig",
  "Vegetable Lumpia",
  "Fish Fillet",
  "Chicken Tinola",
  "Kare-Kare",
  "Pinakbet",
  "Lechon Kawali",
  "Bangus Steak",
]

export default function EmployeeSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState(SUBSCRIPTIONS)
  const [form, setForm] = useState({
    customerId: "",
    mealsPerWeek: "5",
    servingsPerMeal: "2",
    dietaryPreference: "any",
    notes: "",
  })
  const [selectedMeals, setSelectedMeals] = useState<string[]>([])

  function toggleMeal(meal: string) {
    setSelectedMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    )
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const customer = CUSTOMERS.find((c) => c.id === form.customerId)
    const newSub: Subscription = {
      id: `S-${String(subscriptions.length + 1).padStart(3, "0")}`,
      customerId: form.customerId,
      customerName: customer?.name ?? "Unknown",
      details: {
        mealsPerWeek: Number(form.mealsPerWeek),
        servingsPerMeal: Number(form.servingsPerMeal),
        dietaryPreference: form.dietaryPreference,
        includedMeals: selectedMeals,
        notes: form.notes,
      },
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }
    setSubscriptions((prev) => [...prev, newSub])
    setForm({ customerId: "", mealsPerWeek: "5", servingsPerMeal: "2", dietaryPreference: "any", notes: "" })
    setSelectedMeals([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-brand-900">
          <ClipboardList size={24} />
          Subscriptions
        </h1>
        <p className="mt-1 text-sm text-text-secondary">View existing meal plans or create a new subscription for a customer.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SubscriptionGallery
            subscriptions={subscriptions}
            onDelete={(id) => setSubscriptions((prev) => prev.filter((s) => s.id !== id))}
          />
        </div>

        <motion.div
          className="rounded-xl border border-border-light p-5 shadow-md"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-900">
            <Plus size={18} />
            New Subscription
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <User size={14} />
                Customer
              </label>
              <Select
                options={CUSTOMERS.map((c) => ({ label: c.name, value: c.id }))}
                value={form.customerId}
                onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <CalendarDays size={14} />
                Meals per Week
              </label>
              <Input
                type="number"
                min={1}
                max={21}
                value={form.mealsPerWeek}
                onChange={(e) => setForm((prev) => ({ ...prev, mealsPerWeek: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <ChefHat size={14} />
                Servings per Meal
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.servingsPerMeal}
                onChange={(e) => setForm((prev) => ({ ...prev, servingsPerMeal: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <Apple size={14} />
                Dietary Preference
              </label>
              <Select
                options={MEAL_OPTIONS}
                value={form.dietaryPreference}
                onChange={(e) => setForm((prev) => ({ ...prev, dietaryPreference: e.target.value }))}
              />
            </div>

            <fieldset>
              <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <CheckSquare size={15} />
                Included Meals
              </legend>
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border-light p-2">
                {[...INCLUDED_MEALS, ...(selectedMeals.filter((m) => !INCLUDED_MEALS.includes(m)))].map((meal) => (
                  <label
                    key={meal}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedMeals.includes(meal)
                        ? "border-brand-900 bg-brand-900/10 text-brand-900"
                        : "border-border-light text-text-secondary hover:bg-brand-400/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMeals.includes(meal)}
                      onChange={() => toggleMeal(meal)}
                      className="h-4 w-4 accent-brand-900"
                    />
                    {meal}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const name = prompt("Enter meal name:")
                  if (name && name.trim() && !selectedMeals.includes(name.trim())) {
                    setSelectedMeals((prev) => [...prev, name.trim()])
                  }
                }}
                className="mt-2 text-xs font-medium text-brand-900 hover:underline"
              >
                + Different Meal
              </button>
            </fieldset>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-900">
                <CheckSquare size={14} />
                Notes
              </label>
              <Input
                placeholder="Optional notes..."
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full">
              Create Subscription
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
