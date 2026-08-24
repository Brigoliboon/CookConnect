"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button, Input, Select, SubscriptionDialog } from "@/components/ui"
import {
  MEAL_TIMES, MENU_CATEGORIES, GOALS,
  WEIGHT_LOSS_OPTIONS, CARB_OPTIONS, FOOD_RESTRICTIONS, ROTATION_MODES, GOAL_MODIFICATIONS,
  SUBSCRIPTION_PLANS, PLAN_VARIANTS, DELIVERY_DAYS, PAYMENT_METHODS,
} from "@/constants"
import type { SubscriptionPlan } from "@/constants"
import {
  Plus, Apple, CheckSquare, ClipboardList, User, CalendarDays, ChefHat, Clock,
  Sun, Moon, Utensils, Target, Carrot, Ban, RefreshCw, Truck, Hash, Check, X,
  Users, CreditCard,
} from "lucide-react"

const MEAL_TIME_ICONS: Record<string, typeof Clock> = {
  breakfast: Sun,
  "morning-snack": Apple,
  lunch: Utensils,
  "afternoon-snack": Apple,
  dinner: Moon,
}

interface SubscriptionRow {
  id: string
  customer_name: string
  customer_email: string
  details: Record<string, unknown>
  status: "active" | "cancelled"
  created_at: string
}

interface CustomerOption {
  id: string
  name: string
  email: string
}

interface RecipeOption {
  id: string
  name: string
  category: string | null
}

export default function EmployeeSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
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
  const [planVariant, setPlanVariant] = useState("individual")
  const [familySize, setFamilySize] = useState("2")
  const [deliveryDays, setDeliveryDays] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState("bank-transfer")
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [recipes, setRecipes] = useState<RecipeOption[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  async function fetchSubscriptions() {
    try {
      const res = await fetch("/api/subscriptions")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch subscriptions")
      setSubscriptions(data)
    } catch (e) {
      console.error("[SUBSCRIPTIONS] Fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [subsRes, custRes, recipeRes] = await Promise.all([
          fetch("/api/subscriptions"),
          fetch("/api/customers"),
          fetch("/api/recipe"),
        ])

        if (subsRes.ok) {
          const data = await subsRes.json()
          setSubscriptions(data)
        }
        if (custRes.ok) {
          const data = await custRes.json()
          setCustomers(data.map((c: { id: string; name: string; email: string }) => ({ id: c.id, name: c.name, email: c.email })))
        }
        if (recipeRes.ok) {
          const data = await recipeRes.json()
          const active = (data as { id: string; name: string; category: string | null; is_active: boolean }[]).filter(
            (r) => r.is_active !== false,
          )
          setRecipes(active.map((r) => ({ id: r.id, name: r.name, category: r.category })))
        }
      } catch (e) {
        console.error("[SUBSCRIPTIONS] Initial load error:", e)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

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

  function toggleDeliveryDay(day: string) {
    setDeliveryDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
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
    setPlanVariant("individual")
    setFamilySize("2")
    setDeliveryDays([])
    setPaymentMethod("bank-transfer")
    setSelectedPlan(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId) {
      setCreateError("Please select a customer.")
      return
    }
    setCreating(true)
    setCreateError("")
    const recipeIdByMeal = new Map(recipes.map((r) => [r.name, r.id]))
    const includedMealIds = selectedMeals
      .map((name) => recipeIdByMeal.get(name))
      .filter((id): id is string => Boolean(id))
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: form.customerId,
          details: {
            planId: selectedPlan?.id ?? null,
            planName: selectedPlan?.name ?? null,
            planType: selectedPlan?.type ?? null,
            durationDays: selectedPlan?.durationDays ?? null,
            priceAED: null,
            planVariant: planVariant,
            familySize: planVariant === "family" ? Number(familySize) : null,
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
            deliveryDays: deliveryDays,
            paymentMethod: paymentMethod,
            paymentStatus: "pending",
            includedMeals: selectedMeals,
            includedMealIds: includedMealIds,
            notes: form.notes,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create subscription")

      setShowForm(false)
      resetForm()
      fetchSubscriptions()
    } catch (e) {
      console.error("[SUBSCRIPTIONS] Create error:", e)
      setCreateError(e instanceof Error ? e.message : "Failed to create subscription")
    } finally {
      setCreating(false)
    }
  }

  async function handleCancel(id: string) {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to cancel")
      }
      await fetchSubscriptions()
    } catch (e) {
      console.error("[SUBSCRIPTIONS] Cancel error:", e)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Subscriptions</h1>
            <p className="text-sm text-neutral-500">Create meal plans for customers or manage existing subscriptions.</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus size={16} />
          New Subscription
        </Button>
      </div>

      <SubscriptionDialog
        inline
        subscriptions={subscriptions}
        loading={loading}
        onCancel={handleCancel}
      />

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">New Subscription</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">Choose a plan and configure the customer&apos;s meal plan.</p>
                </div>
                <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <CheckSquare size={14} /> Subscription Plan
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          selectedPlan?.id === plan.id
                            ? "border-neutral-900 bg-neutral-900 text-white shadow-lg"
                            : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{plan.name}</p>
                          {selectedPlan?.id === plan.id && <Check size={15} />}
                        </div>
                        <p className={`mt-1 text-xs ${selectedPlan?.id === plan.id ? "text-white/60" : "text-neutral-400"}`}>{plan.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-bold">{plan.durationDays} Days</span>
                          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium uppercase ${plan.type === "healthy" ? "bg-brand-900/20 text-brand-700" : selectedPlan?.id === plan.id ? "bg-white/10 text-white/70" : "bg-neutral-100 text-neutral-500"}`}>
                            {plan.type}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <User size={13} /> Customer
                  </label>
                  {customers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-neutral-300 px-3 py-2.5 text-xs text-neutral-400">
                      No customers in the database yet. Create one from the Customers page first.
                    </p>
                  ) : (
                    <Select
                      options={customers.map((c) => ({ label: c.name, value: c.id }))}
                      value={form.customerId}
                      onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}
                    />
                  )}
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
                    <Users size={13} /> Plan Variant
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PLAN_VARIANTS.map((v) => (
                      <button key={v.value} type="button"
                        onClick={() => setPlanVariant(v.value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                          planVariant === v.value
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  {planVariant === "family" && (
                    <div className="mt-2">
                      <Input type="number" min={1} max={10} label="Family Size" value={familySize}
                        onChange={(e) => setFamilySize(e.target.value)} />
                    </div>
                  )}
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

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <CalendarDays size={13} /> Delivery Days
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DELIVERY_DAYS.map((d) => (
                      <button key={d.value} type="button"
                        onClick={() => toggleDeliveryDay(d.value)}
                        className={`rounded-xl border px-1 py-2 text-xs font-medium transition-all ${
                          deliveryDays.includes(d.value)
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <CreditCard size={13} /> Payment Method
                  </label>
                  <Select
                    options={PAYMENT_METHODS}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                </div>

                <fieldset>
                  <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <CheckSquare size={14} /> Select Meals
                  </legend>
                  {recipes.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-neutral-300 px-3 py-2.5 text-xs text-neutral-400">
                      No recipes in the database yet. Add meals first from the Meals page.
                    </p>
                  ) : (
                    <div className="max-h-60 space-y-3 overflow-y-auto rounded-xl border border-neutral-200 p-3">
                      {Object.entries(
                        recipes.reduce<Record<string, RecipeOption[]>>((acc, r) => {
                          const cat = r.category ?? "uncategorized"
                          ;(acc[cat] ??= []).push(r)
                          return acc
                        }, {}),
                      ).map(([cat, items]) => (
                        <div key={cat}>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                            {MENU_CATEGORIES.find((c) => c.value === cat)?.label ?? cat}
                          </p>
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
                      ))}
                    </div>
                  )}
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

                {createError && (
                  <p className="text-xs font-medium text-red-500">{createError}</p>
                )}

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Creating..." : "Create Subscription"}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
