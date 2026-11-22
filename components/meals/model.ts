import { MENU_CATEGORIES } from "@/constants"
import type { MenuCategory, MenuItem, MealServingOption } from "@/constants"

export type MealListItem = MenuItem & { is_active?: boolean }

export type StatusFilter = "all" | "enabled" | "disabled"

export const VALID_CATEGORIES: Set<string> = new Set(MENU_CATEGORIES.map((c) => c.value))

export const CATEGORY_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  ...MENU_CATEGORIES,
]

export function formatAed(value: number): string {
  return `${Number.isFinite(value) ? value.toFixed(2) : "0.00"} AED`
}

export function formatMacro(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value)
  return Math.abs(value - rounded) < 0.05 ? String(rounded) : value.toFixed(1)
}

export function mapRecipeToItem(r: Record<string, unknown>): MealListItem {
  const rawServings = (r.servings as Record<string, unknown>[]) ?? []
  const servings: MealServingOption[] = rawServings
    .filter((s) => (s.is_active as boolean) !== false)
    .map((s, i): MealServingOption => ({
      id: (s.id as string) ?? `${r.id as string}-serving-${i}`,
      name: (s.name as string | null) ?? null,
      price: (s.price as number | null) ?? null,
      calories: (s.calories as number | null) ?? null,
      nutrition: (s.nutrition as MealServingOption["nutrition"]) ?? null,
      is_active: (s.is_active as boolean) ?? true,
    }))
  const firstServing = rawServings[0] as Record<string, unknown> | undefined
  const firstNutrition = (firstServing?.nutrition as Record<string, unknown> | null)
    ?? (r.nutrition as Record<string, unknown> | null)

  const rawIngredients = (r.ingredients as MealListItem["ingredients"])
    ?? (firstServing?.ingredients as unknown as MealListItem["ingredients"])
    ?? []
  const ingredients: MealListItem["ingredients"] = (rawIngredients as unknown[]).map((ing) => {
    if (typeof ing === "string") return { name: ing, quantity_g: 100, unit: null }
    const o = ing as Record<string, unknown>
    const nested = o.ingredient as Record<string, unknown> | undefined
    return {
      name: ((nested?.name ?? o.name) as string) ?? "",
      quantity_g: ((o.quantity_g ?? 100) as number) ?? 100,
      unit: ((o.unit ?? null) as string | null) ?? null,
    }
  })

  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as MenuCategory) ?? "chicken",
    description: (r.description as string) ?? "",
    price: ((firstServing?.price ?? r.price) as number) ?? 0,
    calories: ((firstServing?.calories ?? r.calories) as number) ?? 0,
    protein: (firstNutrition?.protein_g as number) ?? 0,
    carbs: (firstNutrition?.carbs_g as number) ?? 0,
    fats: (firstNutrition?.fats_g as number) ?? (firstNutrition?.fat_g as number) ?? 0,
    fiber: (firstNutrition?.fiber_g as number) ?? 0,
    sugar: (firstNutrition?.sugar_g as number) ?? 0,
    sodium: (firstNutrition?.sodium_mg as number) ?? 0,
    image_path: (r.image_path as string) ?? null,
    ingredients,
    servings,
    is_active: (r.is_active as boolean) ?? true,
  }
}
