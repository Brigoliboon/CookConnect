import type { Ingredient } from "../models"

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

export interface LinkServingIngredientInput {
  serving_id: string
  ingredient_id: string
  quantity_g: number
  unit: string | null
}

export async function linkServingIngredient(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: LinkServingIngredientInput,
) {
  const { data, error } = await supabase
    .from("serving_ingredients")
    .insert({
      serving_id: input.serving_id,
      ingredient_id: input.ingredient_id,
      quantity_g: input.quantity_g,
      unit: input.unit ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function unlinkServingIngredients(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  servingId: string,
) {
  const { error } = await supabase
    .from("serving_ingredients")
    .delete()
    .eq("serving_id", servingId)

  if (error) throw error
}