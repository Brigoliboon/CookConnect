import { VALID_CATEGORIES, type MealListItem } from "./model"

export interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: string[]
}

export interface ParsedImportRow {
  id: string
  name: string
  category: string | null
  description: string | null
  imagePath: string | null
  price: number | null
  calories: number | null
  nutrition: {
    protein_g: number
    carbs_g: number
    fats_g: number
    fiber_g: number
    sugar_g: number
    sodium_mg: number
  }
  isActive: boolean | undefined
}

function parseOptionalNumber(raw: string): number | null | { error: string } {
  const v = raw.trim()
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return { error: `"${raw}" is not a number` }
  return n
}

function parseOptionalBool(raw: string): boolean | undefined | { error: string } {
  const v = raw.trim().toLowerCase()
  if (!v) return undefined
  if (["true", "1", "yes", "y"].includes(v)) return true
  if (["false", "0", "no", "n"].includes(v)) return false
  return { error: `"${raw}" is not true/false` }
}

export function parseImportRow(col: Record<string, string>, lineNo: number): ParsedImportRow {
  const name = (col.name ?? "").trim()
  if (!name) throw new Error(`line ${lineNo}: name is required`)
  const rawCategory = (col.category ?? "").trim()
  if (rawCategory && !VALID_CATEGORIES.has(rawCategory)) {
    throw new Error(`line ${lineNo}: unknown category "${rawCategory}"`)
  }
  const description = (col.description ?? "").trim() || null
  const imagePath = (col.image_path ?? "").trim() || null

  const price = parseOptionalNumber(col.price_dh ?? "")
  if (price !== null && typeof price === "object") throw new Error(`line ${lineNo}: price ${price.error}`)
  const caloriesRaw = parseOptionalNumber(col.calories ?? "")
  if (caloriesRaw !== null && typeof caloriesRaw === "object") throw new Error(`line ${lineNo}: calories ${caloriesRaw.error}`)
  const calories = caloriesRaw === null ? null : Math.round(caloriesRaw)
  const macros: Record<string, number | null> = {}
  for (const [key, field] of [["protein_g", "protein"], ["carbs_g", "carbs"], ["fats_g", "fats"], ["fiber_g", "fiber"], ["sugar_g", "sugar"], ["sodium_mg", "sodium"]] as const) {
    const parsed = parseOptionalNumber(col[key] ?? "")
    if (parsed !== null && typeof parsed === "object") throw new Error(`line ${lineNo}: ${key} ${parsed.error}`)
    macros[field] = parsed
  }
  const isActive = parseOptionalBool(col.is_active ?? "")
  if (typeof isActive === "object") throw new Error(`line ${lineNo}: is_active ${isActive.error}`)

  return {
    id: (col.id ?? "").trim(),
    name,
    category: rawCategory || null,
    description,
    imagePath,
    price,
    calories,
    nutrition: {
      protein_g: macros.protein ?? 0,
      carbs_g: macros.carbs ?? 0,
      fats_g: macros.fats ?? 0,
      fiber_g: macros.fiber ?? 0,
      sugar_g: macros.sugar ?? 0,
      sodium_mg: macros.sodium ?? 0,
    },
    isActive,
  }
}

export async function executeImportRow(p: ParsedImportRow, lineNo: number): Promise<"created" | "updated"> {
  const { id, name, category, description, imagePath, price, calories, nutrition, isActive } = p
  if (id) {
    const patchRes = await fetch(`/api/recipe/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ...(category ? { category } : {}),
        description,
        ...(imagePath ? { image_path: imagePath } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      }),
    })
    if (!patchRes.ok) {
      const err = await patchRes.json().catch(() => ({}))
      throw new Error(`line ${lineNo}: update failed (${(err as Record<string, string>).error ?? patchRes.status})`)
    }
    const servingsRes = await fetch(`/api/recipe/${id}/servings`)
    const servingsData = servingsRes.ok ? await servingsRes.json() : []
    const servings: Record<string, unknown>[] = Array.isArray(servingsData) ? servingsData : (servingsData.data ?? [])
    const firstServingId = servings[0]?.id as string | undefined
    const servingBody = {
      ...(price !== null ? { price } : {}),
      ...(calories !== null ? { calories } : {}),
      nutrition,
    }
    if (firstServingId) {
      await fetch(`/api/recipe/${id}/servings/${firstServingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(servingBody),
      })
    } else if (price !== null || calories !== null) {
      await fetch(`/api/recipe/${id}/servings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Regular", is_active: true, ...servingBody, ingredients: [] }),
      })
    }
    return "updated"
  }

  const createRes = await fetch("/api/recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      category,
      description,
      image_path: imagePath,
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}))
    throw new Error(`line ${lineNo}: create failed (${(err as Record<string, string>).error ?? createRes.status})`)
  }
  const recipe = await createRes.json()
  await fetch(`/api/recipe/${recipe.id}/servings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Regular",
      price,
      calories,
      nutrition,
      is_active: true,
      ingredients: [],
    }),
  })
  return "created"
}

export async function importRow(col: Record<string, string>, lineNo: number): Promise<"created" | "updated"> {
  return executeImportRow(parseImportRow(col, lineNo), lineNo)
}

export function mealToCsvRow(m: MealListItem): (string | number)[] {
  return [
    m.id, m.name, m.category, m.description, m.price, m.calories,
    m.protein, m.carbs, m.fats, m.fiber, m.sugar, m.sodium,
    (m.is_active ?? true) ? "true" : "false", m.image_path ?? "",
  ]
}
