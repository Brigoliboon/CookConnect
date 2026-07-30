import type { Ingredient, RecipeIngredient } from "../models"

export interface UpsertIngredientInput {
  name: string
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
    .insert({ name: input.name, nutrition: input.nutrition ?? null })
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
