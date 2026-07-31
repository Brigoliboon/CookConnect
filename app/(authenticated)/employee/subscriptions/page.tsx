"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button, Input, Select, SubscriptionGallery } from "@/components/ui"
import {
  SUBSCRIPTIONS, CUSTOMERS, MEAL_TIMES, MENU_CATEGORIES, getMenuByCategory, GOALS,
  WEIGHT_LOSS_OPTIONS, CARB_OPTIONS, FOOD_RESTRICTIONS, ROTATION_MODES, GOAL_MODIFICATIONS,
} from "@/constants"
import type { Subscription } from "@/constants"
import {
  Plus, Apple, CheckSquare, ClipboardList, User, CalendarDays, ChefHat, Clock,
  Sun, Moon, Utensils, Target, Carrot, Ban, RefreshCw, Truck, Hash,
} from "lucide-react"

const MEAL_TIME_ICONS: Record<string, typeof Clock> = {
  breakfast: Sun,
  "morning-snack": Apple,
  lunch: Utensils,
  "afternoon-snack": Apple,
  dinner: Moon,
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900"

export default function EmployeeSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState(SUBSCRIPTIONS)
  const [form, setForm] = useState({
    customerId: "",
    mealsPerWeek: "5",
    servingsPerMeal: "2",
    goal: "balanced",
    goalOption: "",
    customCalories: "",
    customFats: "",
    customCarbs: "",
    preferredCarb: "white-rice",
    restrictionOther: "",
    rotationMode: "chefs-choice",
    deliveryTime: "12:00",
    notes: "",
  })
  const [selectedMealTimes, setSelectedMealTimes] = useState<string[]>([])
  const [selectedMeals, setSelectedMeals] = useState<string[]>([])
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([])

  function toggleMealTime(time: string) {
    setSelectedMealTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    )
  }

  function toggleMeal(meal: string) {
    setSelectedMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    )
  }

  function toggleRestriction(r: string) {
    setSelectedRestrictions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    )
  }

  function resetForm() {
    setForm({
      customerId: "", mealsPerWeek: "5", servingsPerMeal: "2", goal: "balanced",
      goalOption: "", customCalories: "", customFats: "", customCarbs: "",
      preferredCarb: "white-rice", restrictionOther: "", rotationMode: "chefs-choice",
      deliveryTime: "12:00", notes: "",
    })
    setSelectedMealTimes([])
    setSelectedMeals([])
    setSelectedRestrictions([])
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
        goal: form.goal,
        goalOption: form.goalOption,
        customGoal: form.goal === "customized" ? {
          calories: Number(form.customCalories),
          fats: Number(form.customFats),
          carbs: Number(form.customCarbs),
        } : null,
        mealTimes: selectedMealTimes,
        preferredCarb: form.preferredCarb,
        restrictions: selectedRestrictions,
        restrictionOther: form.restrictionOther,
        rotationMode: form.rotationMode,
        deliveryTime: form.deliveryTime,
        includedMeals: selectedMeals,
        notes: form.notes,
      },
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }
    setSubscriptions((prev) => [...prev, newSub])
    resetForm()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
          <ClipboardList size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Subscriptions</h1>
          <p className="text-sm text-neutral-500">View existing meal plans or create a new subscription for a customer.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SubscriptionGallery
            subscriptions={subscriptions}
            onDelete={(id) => setSubscriptions((prev) => prev.filter((s) => s.id !== id))}
          />
        </div>

        <motion.div
          className="rounded-2xl border border-neutral-200/60 bg-white/80 p-6 backdrop-blur-sm shadow-sm"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-5 flex items-center gap-2 text-base font-semibold text-neutral-900">
            <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100">
              <Plus size={14} className="text-neutral-600" />
            </div>
            New Subscription
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <User size={13} /> Customer
              </label>
              <Select
                options={CUSTOMERS.map((c) => ({ label: c.name, value: c.id }))}
                value={form.customerId}
                onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <CalendarDays size={13} /> Meals / Week
                </label>
                <Input type="number" min={1} max={21} value={form.mealsPerWeek}
                  onChange={(e) => setForm((prev) => ({ ...prev, mealsPerWeek: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <ChefHat size={13} /> Servings
                </label>
                <Input type="number" min={1} max={20} value={form.servingsPerMeal}
                  onChange={(e) => setForm((prev) => ({ ...prev, servingsPerMeal: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Target size={13} /> Goal
              </label>
              <Select
                options={GOALS}
                value={form.goal}
                onChange={(e) => setForm((prev) => ({ ...prev, goal: e.target.value, goalOption: "" }))}
              />
              {form.goal === "weight-loss" && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {WEIGHT_LOSS_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((prev) => ({ ...prev, goalOption: opt.value }))}
                      className={`rounded-xl border px-2 py-1.5 text-xs font-medium transition-all ${
                        form.goalOption === opt.value
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {form.goal === "customized" && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input label="Calories" type="number" value={form.customCalories}
                    onChange={(e) => setForm((prev) => ({ ...prev, customCalories: e.target.value }))} />
                  <Input label="Fats (g)" type="number" value={form.customFats}
                    onChange={(e) => setForm((prev) => ({ ...prev, customFats: e.target.value }))} />
                  <Input label="Carbs (g)" type="number" value={form.customCarbs}
                    onChange={(e) => setForm((prev) => ({ ...prev, customCarbs: e.target.value }))} />
                </div>
              )}
              <p className="mt-1.5 text-[10px] italic text-neutral-400">
                {GOAL_MODIFICATIONS[form.goal as keyof typeof GOAL_MODIFICATIONS] ?? ""}
              </p>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Carrot size={13} /> Preferred Carb
              </label>
              <Select
                options={CARB_OPTIONS}
                value={form.preferredCarb}
                onChange={(e) => setForm((prev) => ({ ...prev, preferredCarb: e.target.value }))}
              />
            </div>

            <fieldset>
              <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Ban size={14} /> Food Restrictions
              </legend>
              <div className="grid grid-cols-2 gap-1.5">
                {FOOD_RESTRICTIONS.map((r) => (
                  <label key={r.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      selectedRestrictions.includes(r.value)
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    <input type="checkbox" checked={selectedRestrictions.includes(r.value)}
                      onChange={() => toggleRestriction(r.value)} className="h-4 w-4 accent-neutral-900" />
                    {r.label}
                  </label>
                ))}
              </div>
              {selectedRestrictions.includes("other") && (
                <Input placeholder="Specify other restrictions..." value={form.restrictionOther}
                  onChange={(e) => setForm((prev) => ({ ...prev, restrictionOther: e.target.value }))}
                  className="mt-2" />
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Clock size={14} /> Meal Times
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_TIMES.map((mt) => {
                  const Icon = MEAL_TIME_ICONS[mt.value] ?? Clock
                  const selected = selectedMealTimes.includes(mt.value)
                  return (
                    <label key={mt.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                        selected
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                      }`}
                    >
                      <input type="checkbox" checked={selected}
                        onChange={() => toggleMealTime(mt.value)} className="h-4 w-4 accent-neutral-900" />
                      <Icon size={15} /> {mt.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <RefreshCw size={13} /> Meal Rotation
              </label>
              <Select
                options={ROTATION_MODES}
                value={form.rotationMode}
                onChange={(e) => setForm((prev) => ({ ...prev, rotationMode: e.target.value }))}
              />
              {form.rotationMode === "pre-select" && (
                <p className="mt-1 text-[10px] text-neutral-400">Cut-off: Thursday 11:59 PM</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Truck size={13} /> Preferred Delivery Time
              </label>
              <Input type="time" value={form.deliveryTime}
                onChange={(e) => setForm((prev) => ({ ...prev, deliveryTime: e.target.value }))} />
            </div>

            <fieldset>
              <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <CheckSquare size={14} /> Select Meals
              </legend>
              <div className="max-h-60 space-y-3 overflow-y-auto rounded-xl border border-neutral-200 p-3">
                {MENU_CATEGORIES.map((cat) => {
                  const items = getMenuByCategory(cat.value)
                  return (
                    <div key={cat.value}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">{cat.label}</p>
                      <div className="space-y-1">
                        {items.map((meal) => (
                          <label key={meal.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-all ${
                              selectedMeals.includes(meal.name)
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                            }`}
                          >
                            <input type="checkbox" checked={selectedMeals.includes(meal.name)}
                              onChange={() => toggleMeal(meal.name)} className="h-4 w-4 accent-neutral-900" />
                            <span className="flex-1">{meal.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button type="button"
                onClick={() => {
                  const name = prompt("Enter meal name:")
                  if (name && name.trim() && !selectedMeals.includes(name.trim())) {
                    setSelectedMeals((prev) => [...prev, name.trim()])
                  }
                }}
                className="mt-2 text-xs font-medium text-neutral-900 hover:underline"
              >
                + Custom Meal
              </button>
            </fieldset>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Hash size={13} /> Notes
              </label>
              <Input placeholder="Optional notes..." value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>

            <Button type="submit" className="w-full">Create Subscription</Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
