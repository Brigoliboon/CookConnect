import type { Recipe } from "../models"

export type CreateRecipeInput = Pick<Recipe, "name"> & Partial<Omit<Recipe, "id" | "name">>

export interface RecipeIngredientField {
  name: string
  quantity_g: number
  unit: string | null
  nutrition: Record<string, unknown> | null
  fatsecret_id: string | null
}

export interface RecipeServing {
  id: string
  name: string | null
  price: number | null
  calories: number | null
  nutrition: Record<string, unknown> | null
  is_active: boolean
  ingredients: RecipeIngredientField[]
}

export interface RecipeWithServings extends Recipe {
  servings: RecipeServing[]
}

export type RecipeSort =
  | "name"
  | "name_desc"
  | "calories"
  | "calories_desc"
  | "price"
  | "price_desc"
  | "sales"
  | "sales_desc"

/** Filters accepted by `GET /api/recipe`. */
export interface ListRecipesFilters {
  ids?: string[]
  search?: string
  category?: string
  isActive?: boolean
  minCalories?: number
  maxCalories?: number
  minPrice?: number
  maxPrice?: number
  sort?: RecipeSort
  offset?: number
  limit?: number
  /** Include each serving's ingredient list. Omitted by default to keep list responses small. */
  includeIngredients?: boolean
}

export interface RecipeListResult {
  data: RecipeWithServings[]
  total: number
}

export async function createRecipe(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateRecipeInput,
): Promise<Recipe> {
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      name: input.name,
      category: input.category ?? null,
      description: input.description ?? null,
      is_active: input.is_active ?? true,
      image_path: input.image_path ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Recipe
}

export async function updateRecipe(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
  input: Partial<CreateRecipeInput>,
): Promise<Recipe> {
  const { data, error } = await supabase
    .from("recipes")
    .update({
      ...input,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Recipe
}

export async function deleteRecipe(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)

  if (error) throw error
}

const RECIPE_COLUMNS = "id, name, category, description, is_active, image_path, primary_protein_ingredient_id"
const SERVING_COLUMNS = "name, price, calories, nutrition, is_active"
const SERVING_INGREDIENT_COLUMNS = "serving_ingredients(quantity_g, unit, ingredient:ingredients(name, nutrition, fatsecret_id))"

export async function listRecipes(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  filters: ListRecipesFilters = {},
): Promise<RecipeListResult> {
  const servings = filters.includeIngredients
    ? `servings(${SERVING_COLUMNS}, ${SERVING_INGREDIENT_COLUMNS})`
    : `servings(${SERVING_COLUMNS})`
  const offset = filters.offset ?? 0
  const limit = filters.limit

  // Price/calorie filters and sorts depend on the first serving, so they are
  // applied after mapping. Name sorts can be paginated by the database.
  const canPaginateInSql =
    limit !== undefined &&
    filters.minCalories === undefined &&
    filters.maxCalories === undefined &&
    filters.minPrice === undefined &&
    filters.maxPrice === undefined &&
    (filters.sort === "name" || filters.sort === "name_desc")

  let query = supabase
    .from("recipes")
    .select(`${RECIPE_COLUMNS}, ${servings}`, { count: canPaginateInSql ? "exact" : undefined })

  if (filters.search) {
    for (const tok of filters.search.split(/\s+/).filter(Boolean)) {
      const p = `%${escapeLike(tok)}%`
      query = query.or(`name.ilike.${p},description.ilike.${p},category.ilike.${p}`)
    }
  }
  if (filters.category) {
    query = query.eq("category", filters.category)
  }
  if (filters.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive)
  }
  if (filters.ids && filters.ids.length > 0) {
    query = query.in("id", filters.ids)
  }

  if (canPaginateInSql) {
    query = query
      .order("name", { ascending: filters.sort !== "name_desc" })
      .range(offset, offset + limit - 1)
  }

  const { data: recipes, error, count } = await query

  if (error) throw error

  let data = (recipes as Record<string, unknown>[]).map(mapRecipeWithServings)

  if (canPaginateInSql) {
    return { data, total: count ?? data.length }
  }

  data = data.filter((recipe) => {
    const serving = recipe.servings[0]
    const calories = serving?.calories
    const price = serving?.price

    return (
      (filters.minCalories === undefined || (calories !== null && calories !== undefined && calories >= filters.minCalories)) &&
      (filters.maxCalories === undefined || (calories !== null && calories !== undefined && calories <= filters.maxCalories)) &&
      (filters.minPrice === undefined || (price !== null && price !== undefined && price >= filters.minPrice)) &&
      (filters.maxPrice === undefined || (price !== null && price !== undefined && price <= filters.maxPrice))
    )
  })

  const unitsSold =
    filters.sort === "sales" || filters.sort === "sales_desc" ? await loadUnitsSold(supabase) : null
  sortRecipes(data, filters.sort, unitsSold)

  const total = data.length
  if (limit !== undefined) data = data.slice(offset, offset + limit)
  else if (offset > 0) data = data.slice(offset)

  return { data, total }
}

export interface CategoryTopSeller {
  category: string
  recipe: RecipeWithServings | null
}

export async function getTopSellersByCategory(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  categories: string[],
): Promise<CategoryTopSeller[]> {
  const wanted: string[] = []
  for (const raw of categories) {
    const category = raw.trim()
    if (category && !wanted.includes(category)) wanted.push(category)
  }
  if (wanted.length === 0) return []

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select(`${RECIPE_COLUMNS}, servings(${SERVING_COLUMNS})`)
    .in("category", wanted)
    .eq("is_active", true)

  if (error) throw error

  const unitsSold = await loadUnitsSold(supabase)

  const groups = new Map<string, RecipeWithServings[]>()
  for (const category of wanted) groups.set(category, [])
  for (const raw of (recipes ?? []) as Record<string, unknown>[]) {
    const recipe = mapRecipeWithServings(raw)
    groups.get(recipe.category ?? "")?.push(recipe)
  }
  for (const group of groups.values()) sortRecipes(group, "sales_desc", unitsSold)

  return wanted.map((category) => ({ category, recipe: groups.get(category)?.[0] ?? null }))
}

function mapRecipeWithServings(r: Record<string, unknown>): RecipeWithServings {
  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    is_active: r.is_active as boolean,
    image_path: (r.image_path as string | null) ?? null,
    primary_protein_ingredient_id: (r.primary_protein_ingredient_id as string | null) ?? null,
    servings: ((r.servings as Record<string, unknown>[]) ?? [])
      .filter((s) => (s.is_active as boolean) !== false)
      .map((s) => ({
        id: s.id as string,
        name: (s.name as string | null) ?? null,
        price: (s.price as number | null) ?? null,
        calories: (s.calories as number | null) ?? null,
        nutrition: (s.nutrition as Record<string, unknown> | null) ?? null,
        is_active: s.is_active as boolean,
        ingredients: mapServingIngredients(s.serving_ingredients),
      })),
  }
}

async function loadUnitsSold(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("order_items")
    .select("recipe_id, qty, orders!inner(status, delivered_at)")
    .eq("orders.status", "delivered")
    .not("orders.delivered_at", "is", null)

  if (error) throw error

  const totals = new Map<string, number>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const recipeId = row.recipe_id as string | null
    if (!recipeId) continue
    totals.set(recipeId, (totals.get(recipeId) ?? 0) + (Number(row.qty) || 0))
  }
  return totals
}

function sortRecipes(
  recipes: RecipeWithServings[],
  sort: RecipeSort | undefined,
  unitsSold?: Map<string, number> | null,
) {
  if (!sort) return

  const direction = sort.endsWith("_desc") ? -1 : 1

  if (sort.startsWith("sales")) {
    const sold = (recipe: RecipeWithServings) => unitsSold?.get(recipe.id) ?? 0
    recipes.sort((a, b) => {
      const diff = sold(a) - sold(b)
      return diff !== 0 ? direction * diff : a.name.localeCompare(b.name)
    })
    return
  }

  recipes.sort((a, b) => {
    if (sort.startsWith("name")) return direction * a.name.localeCompare(b.name)

    const field = sort.startsWith("calories") ? "calories" : "price"
    const aValue = a.servings[0]?.[field] ?? Number.POSITIVE_INFINITY
    const bValue = b.servings[0]?.[field] ?? Number.POSITIVE_INFINITY
    return direction * (aValue - bValue)
  })
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\\\$&")
}

export async function getRecipe(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<RecipeWithServings | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "*, servings(name, price, calories, nutrition, is_active, serving_ingredients(quantity_g, unit, ingredient:ingredients(name, nutrition, fatsecret_id)))",
    )
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  const r = data as Record<string, unknown>
  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    is_active: r.is_active as boolean,
    image_path: (r.image_path as string | null) ?? null,
    primary_protein_ingredient_id: (r.primary_protein_ingredient_id as string | null) ?? null,
    servings: ((r.servings as Record<string, unknown>[]) ?? [])
      .filter((s) => (s.is_active as boolean) !== false)
      .map((s) => ({
        id: s.id as string,
        name: (s.name as string | null) ?? null,
        price: (s.price as number | null) ?? null,
        calories: (s.calories as number | null) ?? null,
        nutrition: (s.nutrition as Record<string, unknown> | null) ?? null,
        is_active: s.is_active as boolean,
        ingredients: mapServingIngredients(s.serving_ingredients),
      })),
  }
}

function mapServingIngredients(rows: unknown): RecipeIngredientField[] {
  return ((rows as Record<string, unknown>[]) ?? []).map((si: Record<string, unknown>) => ({
    name: (si.ingredient as Record<string, unknown>)?.name as string,
    quantity_g: si.quantity_g as number,
    unit: si.unit as string | null,
    nutrition: (si.ingredient as Record<string, unknown>)?.nutrition as Record<string, unknown> | null,
    fatsecret_id: (si.ingredient as Record<string, unknown>)?.fatsecret_id as string | null,
  }))
}
