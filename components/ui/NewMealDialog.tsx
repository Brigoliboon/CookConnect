"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ImageIcon, Calculator, Trash2, Search, ChevronDown } from "lucide-react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts"
import { MENU_CATEGORIES } from "@/constants"

const COLORS = {
  protein: "#FA6868",
  carbs: "#5A9CB5",
  fat: "#FACE68",
  fiber: "#79AE6F",
  sugar: "#E9C46A",
  sodium: "#7B5EA7",
}

const RADIAN = Math.PI / 180

function DonutLabel(props: Record<string, number | undefined>) {
  const cx = props.cx ?? 0
  const cy = props.cy ?? 0
  const midAngle = props.midAngle ?? 0
  const innerRadius = props.innerRadius ?? 0
  const outerRadius = props.outerRadius ?? 80
  const percent = props.percent ?? 0
  const radius = innerRadius + (outerRadius - innerRadius) * 1.35
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#6b7280">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

interface FoodSearchResult {
  food_id: string
  food_name: string
  food_description: string
}

interface FoodServing {
  serving_description: string
  metric_serving_amount: string
  metric_serving_unit: string
  calories: string
  carbohydrate: string
  protein: string
  fat: string
  fiber?: string
  sugar?: string
  sodium?: string
}

interface IngredientItem {
  food_id: string
  name: string
  amount: number
  unit: string
  servingDesc: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
}

function parseSearchDescription(desc: string) {
  const cal = desc.match(/Calories:\s*([\d.]+)/)?.[1] ?? "0"
  const fat = desc.match(/Fat:\s*([\d.]+)/)?.[1] ?? "0"
  const carbs = desc.match(/Carbs:\s*([\d.]+)/)?.[1] ?? "0"
  const protein = desc.match(/Protein:\s*([\d.]+)/)?.[1] ?? "0"
  return { calories: cal, fat, carbs, protein }
}

interface NewMealDialogProps {
  open: boolean
  onClose: () => void
}

export function NewMealDialog({ open, onClose }: NewMealDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [mealName, setMealName] = useState("")
  const [description, setDescription] = useState("")
  const [ingredients, setIngredients] = useState<IngredientItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nutrition, setNutrition] = useState({
    calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0,
  })

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/fatsecret/search?search_expression=${encodeURIComponent(q)}&max_results=5`)
      const data = await res.json()
      const foods = data?.foods?.food
      if (Array.isArray(foods)) {
        setSearchResults(foods.map((f: Record<string, string>) => ({
          food_id: f.food_id,
          food_name: f.food_name,
          food_description: f.food_description ?? "",
        })))
        setShowDropdown(true)
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    } catch {
      setSearchResults([])
      setShowDropdown(false)
    } finally {
      setSearching(false)
    }
  }, [])

  async function selectFood(food: FoodSearchResult) {
    setShowDropdown(false)
    setSearchQuery("")

    try {
      const res = await fetch(`/api/fatsecret/food?food_id=${food.food_id}`)
      const data = await res.json()
      const servings = data?.food?.servings?.serving
      const serving = Array.isArray(servings) ? servings[0] : servings
      if (!serving) return

      const s = serving as FoodServing
      const amount = parseFloat(s.metric_serving_amount) || 100
      const parsed = food.food_description ? parseSearchDescription(food.food_description) : { calories: "0", fat: "0", carbs: "0", protein: "0" }

      const item: IngredientItem = {
        food_id: food.food_id,
        name: food.food_name,
        amount: 100,
        unit: s.metric_serving_unit || "g",
        servingDesc: s.serving_description || "100 g",
        calories: Math.round(parseFloat(s.calories || parsed.calories) * (100 / amount)),
        protein: Math.round(parseFloat(s.protein || parsed.protein) * (100 / amount) * 10) / 10,
        carbs: Math.round(parseFloat(s.carbohydrate || parsed.carbs) * (100 / amount) * 10) / 10,
        fat: Math.round(parseFloat(s.fat || parsed.fat) * (100 / amount) * 10) / 10,
        fiber: Math.round(parseFloat(s.fiber ?? "0") * (100 / amount) * 10) / 10,
        sugar: Math.round(parseFloat(s.sugar ?? "0") * (100 / amount) * 10) / 10,
        sodium: Math.round(parseFloat(s.sodium ?? "0") * (100 / amount) * 10) / 10,
      }
      setIngredients((prev) => [...prev, item])
    } catch {
      // fallback with parsed description
      const parsed = parseSearchDescription(food.food_description)
      const item: IngredientItem = {
        food_id: food.food_id,
        name: food.food_name,
        amount: 100,
        unit: "g",
        servingDesc: "100 g",
        calories: Math.round(parseFloat(parsed.calories)),
        protein: Math.round(parseFloat(parsed.protein) * 10) / 10,
        carbs: Math.round(parseFloat(parsed.carbs) * 10) / 10,
        fat: Math.round(parseFloat(parsed.fat) * 10) / 10,
        fiber: 0, sugar: 0, sodium: 0,
      }
      setIngredients((prev) => [...prev, item])
    }
  }

  function updateAmount(index: number, value: number) {
    if (value <= 0 || Number.isNaN(value)) return
    setIngredients((prev) => prev.map((ing, i) => {
      if (i !== index) return ing
      const ratio = value / ing.amount
      return {
        ...ing,
        amount: value,
        calories: Math.round(ing.calories * ratio),
        protein: Math.round(ing.protein * ratio * 10) / 10,
        carbs: Math.round(ing.carbs * ratio * 10) / 10,
        fat: Math.round(ing.fat * ratio * 10) / 10,
        fiber: Math.round(ing.fiber * ratio * 10) / 10,
        sugar: Math.round(ing.sugar * ratio * 10) / 10,
        sodium: Math.round(ing.sodium * ratio * 10) / 10,
      }
    }))
  }

  function clampAmount(index: number) {
    setIngredients((prev) => prev.map((ing, i) => {
      if (i !== index || ing.amount >= 1) return ing
      return { ...ing, amount: 1 }
    }))
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  function handleCalculate() {
    setCalculating(true)
    const total = ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + ing.calories,
        protein: acc.protein + ing.protein,
        carbs: acc.carbs + ing.carbs,
        fats: acc.fats + ing.fat,
        fiber: acc.fiber + ing.fiber,
        sugar: acc.sugar + ing.sugar,
        sodium: acc.sodium + ing.sodium,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0 },
    )
    setNutrition(total)
    setTimeout(() => {
      setShowResults(true)
      setCalculating(false)
    }, 300)
  }

  function getCategoryValue() {
    const found = MENU_CATEGORIES.find((c) => c.label === category)
    return found?.value ?? (category || null)
  }

  async function handleSave() {
    if (!mealName.trim()) return
    setSaving(true)
    try {
      let imageUrl: string | null = null
      if (imageFile) {
        const formData = new FormData()
        formData.append("file", imageFile)
        const imgRes = await fetch("/api/upload", { method: "POST", body: formData })
        if (imgRes.ok) {
          const imgData = await imgRes.json()
          imageUrl = imgData.url
        }
      }

      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mealName.trim(),
          category: getCategoryValue(),
          description: description.trim() || null,
          price: price ? parseFloat(price) : null,
          calories: nutrition.calories || null,
          image_path: imageUrl,
          nutrition: {
            protein_g: nutrition.protein,
            carbs_g: nutrition.carbs,
            fats_g: nutrition.fats,
            fiber_g: nutrition.fiber,
            sugar_g: nutrition.sugar,
            sodium_mg: nutrition.sodium,
          },
          ingredients: ingredients.map((ing) => ({
            name: ing.name,
            quantity_g: ing.amount,
            unit: ing.unit,
            nutrition: {
              calories_per_100g: Math.round(ing.calories / (ing.amount / 100)),
              protein_g: ing.protein,
              carbs_g: ing.carbs,
              fats_g: ing.fat,
              fiber_g: ing.fiber,
              sugar_g: ing.sugar,
              sodium_mg: ing.sodium,
            },
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error("[NEW_MEAL] Save failed:", err.error)
        return
      }
      handleClose()
    } catch (e) {
      console.error("[NEW_MEAL] Save error:", e)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setImagePreview("")
    setImageFile(null)
    setMealName("")
    setPrice("")
    setDescription("")
    setIngredients([])
    setSearchQuery("")
    setSearchResults([])
    setShowDropdown(false)
    setShowResults(false)
    setCalculating(false)
    setSaving(false)
    setCategory("")
    onClose()
  }

  const donutData = [
    { name: "Protein", value: nutrition.protein, color: COLORS.protein },
    { name: "Carbs", value: nutrition.carbs, color: COLORS.carbs },
    { name: "Fats", value: nutrition.fats, color: COLORS.fat },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="flex max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-[500px] shrink-0 flex-col">
              <div className="flex items-center justify-between px-8 pt-7 pb-2">
                <h2 className="text-2xl font-bold text-neutral-900">New Meal</h2>
                <button onClick={handleClose} className="text-neutral-400 transition-colors hover:text-neutral-700">
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-8 pb-3">
                <div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-52 w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-400 transition-colors hover:bg-neutral-200"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon size={36} />
                        <span className="text-sm">Upload photo</span>
                      </div>
                    )}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </div>

                <div>
                  <div className="flex items-end gap-3">
                    <input
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                      maxLength={60}
                      className="min-w-0 flex-1 border-0 border-b border-neutral-200 bg-transparent px-0 pb-2 pt-0 text-2xl font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-900"
                      placeholder="Meal name"
                    />
                    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5">
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min={0}
                        step={0.5}
                        className="w-14 text-right text-sm font-semibold text-neutral-900 outline-none"
                        placeholder="0"
                      />
                      <span className="text-xs text-neutral-500">DH</span>
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-neutral-400">
                    <span />
                    <span>{mealName.length}/60</span>
                  </div>
                </div>

                <div className="relative">
                  <label className="mb-1.5 block text-base font-semibold text-neutral-800">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition-colors focus:border-neutral-900"
                  >
                    <span className={category ? "" : "text-neutral-400"}>{category || "Select category"}</span>
                    <ChevronDown size={18} className="text-neutral-400" />
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
                      {MENU_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setCategory(cat.label)
                            setShowCategoryDropdown(false)
                          }}
                          className="flex w-full px-4 py-3 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-50 first:rounded-t-xl last:rounded-b-xl"
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-base font-semibold text-neutral-800">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={200}
                    className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                    placeholder="Describe the meal..."
                  />
                  <p className="mt-1 text-right text-xs text-neutral-400">{description.length}/200</p>
                </div>

                <div className="relative">
                  <label className="mb-1.5 block text-base font-semibold text-neutral-800">Ingredients</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          if (!e.target.value) {
                            setSearchResults([])
                            setShowDropdown(false)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            doSearch(searchQuery)
                          }
                        }}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 pe-10 text-base text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                        placeholder="Search ingredients..."
                      />
                      <button
                        onClick={() => doSearch(searchQuery)}
                        disabled={searching}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-700 disabled:opacity-60"
                      >
                        {searching ? (
                          <div className="size-[18px] animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                        ) : (
                          <Search size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
                      {searchResults.map((food) => (
                        <button
                          key={food.food_id}
                          type="button"
                          onClick={() => selectFood(food)}
                          className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm transition-colors hover:bg-neutral-50 first:rounded-t-xl last:rounded-b-xl"
                        >
                          <span className="font-medium text-neutral-900">{food.food_name}</span>
                          {food.food_description && (
                            <span className="text-xs text-neutral-500">{food.food_description}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {ingredients.length > 0 && (
                    <div className="mt-3 flex max-h-52 flex-col gap-2 overflow-auto">
                      {ingredients.map((ing, i) => (
                        <div
                          key={`${ing.food_id}-${i}`}
                          className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3"
                        >
                          <div className="flex shrink-0 items-center gap-1">
                             <input
                              type="number"
                              value={ing.amount}
                              onChange={(e) => updateAmount(i, Number(e.target.value))}
                              onBlur={() => clampAmount(i)}
                              className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-center text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
                              min={1}
                            />
                            <span className="text-xs text-neutral-500">{ing.unit}</span>
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">{ing.name}</span>
                          <button
                            onClick={() => removeIngredient(i)}
                            className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={calculating || ingredients.length === 0}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-neutral-900 px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-40"
                >
                  <Calculator size={18} />
                  {calculating ? "Calculating..." : "Calculate Calories"}
                </button>
              </div>
            </div>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: showResults ? 440 : 0, opacity: showResults ? 1 : 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="max-h-full overflow-y-auto border-l border-neutral-200"
            >
              <div className="w-[440px] space-y-8 px-8 pt-7 pb-3">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-500">Total Calories</p>
                  <p className="mt-1 text-5xl font-extrabold tracking-tight text-neutral-900">
                    {nutrition.calories}
                  </p>
                </div>

                <div>
                  <p className="mb-4 text-sm font-semibold text-neutral-500">Macros Breakdown</p>
                  <div className="flex justify-center">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => (
                            <DonutLabel cx={cx} cy={cy} midAngle={midAngle} innerRadius={innerRadius} outerRadius={outerRadius} percent={percent} />
                          )}
                          strokeWidth={0}
                        >
                          {donutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex justify-center gap-6 text-sm">
                    {donutData.map((d) => (
                      <span key={d.name} className="inline-flex items-center gap-1.5 text-neutral-600">
                        <span className="size-3 rounded-sm" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold text-neutral-500">Nutritional Content</p>
                  <div className="divide-y divide-neutral-200 border-t border-b border-neutral-300 text-sm">
                    {[
                      { label: "Protein", value: nutrition.protein, unit: "g", color: COLORS.protein },
                      { label: "Carbs", value: nutrition.carbs, unit: "g", color: COLORS.carbs },
                      { label: "Fats", value: nutrition.fats, unit: "g", color: COLORS.fat },
                      { label: "Fiber", value: nutrition.fiber, unit: "g", color: COLORS.fiber },
                      { label: "Sugar", value: nutrition.sugar, unit: "g", color: COLORS.sugar },
                      { label: "Sodium", value: nutrition.sodium, unit: "mg", color: COLORS.sodium },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-2.5">
                        <span className="flex items-center gap-2 font-medium text-neutral-800">
                          <span className="size-2.5 rounded-sm" style={{ backgroundColor: row.color }} />
                          {row.label}
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {row.value}
                          <span className="ml-0.5 text-xs font-normal text-neutral-500">{row.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-neutral-200 pt-5">
                  <button onClick={handleClose} className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700">
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !mealName.trim()}
                    className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Meal"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
