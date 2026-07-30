import type { Ingredient, RecipeIngredient } from "../models"

export interface UpsertIngredientInput {
  name: string
  fatsecret_id?: string | null
  nutrition?: Record<string, unknown> | null
}

export async function upsertIngredient(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: UpsertIngredientInput,
): Promise<Ingredient> {
  const { data: existing } = await supabase
    .from("ingredients")
    .select("*")
    .eq("name", input.name)
    .maybeSingle()

  if (existing) return existing as Ingredient

  const { data, error } = await supabase
    .from("ingredients")
    .insert({ name: input.name, nutrition: input.nutrition ?? null, fatsecret_id: input.fatsecret_id ?? null })
    .select()
    .single()

  if (error) throw error
  return data as Ingredient
}

export interface LinkIngredientInput {
  recipe_id: string
  ingredient_id: string
  quantity_g: number
  unit: string | null
}

export async function linkIngredient(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: LinkIngredientInput,
): Promise<RecipeIngredient> {
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as RecipeIngredient
}

export async function unlinkRecipeIngredients(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  recipeId: string,
) {
  const { error } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId)

  if (error) throw error
}
