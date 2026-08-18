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

export async function listRecipes(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<RecipeWithServings[]> {
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select(
      "*, servings(name, price, calories, nutrition, is_active, serving_ingredients(quantity_g, unit, ingredient:ingredients(name, nutrition, fatsecret_id)))",
    )

  if (error) throw error

  return (recipes as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    is_active: r.is_active as boolean,
    image_path: (r.image_path as string | null) ?? null,
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
  })) as RecipeWithServings[]
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