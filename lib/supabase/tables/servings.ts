import type { Serving } from "../models"
import type { RecipeIngredientField } from "./recipes"
import { upsertIngredient } from "./ingredients"

export type CreateServingInput = Pick<Serving, "name"> &
  Partial<Omit<Serving, "id" | "recipe_id" | "name" | "created_at" | "updated_at">>

export interface ServingWithIngredients extends Serving {
  ingredients: RecipeIngredientField[]
}

export interface ServingIngredientInput {
  ingredient_id?: string | null
  name: string
  quantity_g: number
  unit: string | null
  nutrition?: Record<string, unknown> | null
  fatsecret_id?: string | null
}

export interface LinkedServingIngredient {
  ingredient_id: string
  name: string
  quantity_g: number
  unit: string | null
}

export async function linkServingIngredients(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  ingredients: ServingIngredientInput[],
): Promise<LinkedServingIngredient[]> {
  const linked: LinkedServingIngredient[] = []
  for (const ing of ingredients) {
    const ingredient = await upsertIngredient(supabase, {
      fatsecret_id: ing.fatsecret_id ?? null,
      name: ing.name,
      nutrition: ing.nutrition ?? null,
    })
    linked.push({
      ingredient_id: ingredient.id,
      name: ingredient.name,
      quantity_g: ing.quantity_g,
      unit: ing.unit ?? null,
    })
  }
  return linked
}

export async function listServingsForRecipe(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  recipeId: string,
): Promise<ServingWithIngredients[]> {
  const { data, error } = await supabase
    .from("servings")
    .select("*, serving_ingredients(quantity_g, unit, ingredient:ingredients(name, nutrition, fatsecret_id))")
    .eq("recipe_id", recipeId)
    .eq("is_active", true)

  if (error) throw error
  return (data as Record<string, unknown>[]).map((s) => mapServing(s))
}

export async function listAllServings(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<ServingWithIngredients[]> {
  const { data, error } = await supabase
    .from("servings")
    .select("*, serving_ingredients(quantity_g, unit, ingredient:ingredients(name, nutrition, fatsecret_id))")
    .eq("is_active", true)

  if (error) throw error
  return (data as Record<string, unknown>[]).map((s) => mapServing(s))
}

export async function getServing(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<ServingWithIngredients | null> {
  const { data, error } = await supabase
    .from("servings")
    .select("*, serving_ingredients(quantity_g, unit, ingredient:ingredients(name, nutrition, fatsecret_id))")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return mapServing(data as Record<string, unknown>)
}

export async function createServing(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  recipeId: string,
  input: CreateServingInput,
  ingredients: ServingIngredientInput[] = [],
): Promise<ServingWithIngredients> {
  const { data, error } = await supabase
    .from("servings")
    .insert({
      recipe_id: recipeId,
      name: input.name,
      price: input.price ?? null,
      calories: input.calories ?? null,
      nutrition: input.nutrition ?? {},
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error

  const serving = data as Serving
  return {
    ...serving,
    ingredients: await insertServingIngredients(supabase, serving.id, ingredients),
  }
}

export async function updateServing(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
  input: Partial<CreateServingInput>,
): Promise<Serving> {
  const { data, error } = await supabase
    .from("servings")
    .update({
      ...input,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Serving
}

export async function replaceServingIngredients(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  servingId: string,
  ingredients: ServingIngredientInput[],
): Promise<RecipeIngredientField[]> {
  const { error: delError } = await supabase
    .from("serving_ingredients")
    .delete()
    .eq("serving_id", servingId)
  if (delError) throw delError

  return insertServingIngredients(supabase, servingId, ingredients)
}

export async function deleteServing(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<void> {
  const { error: linkError } = await supabase
    .from("serving_ingredients")
    .delete()
    .eq("serving_id", id)
  if (linkError) throw linkError

  const { error } = await supabase
    .from("servings")
    .delete()
    .eq("id", id)
  if (error) throw error
}

async function insertServingIngredients(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  servingId: string,
  ingredients: ServingIngredientInput[],
): Promise<RecipeIngredientField[]> {
  if (!ingredients.length) return []

  const rows = ingredients.map((ing) => ({
    serving_id: servingId,
    ingredient_id: ing.ingredient_id ?? null,
    quantity_g: ing.quantity_g,
    unit: ing.unit ?? null,
  }))

  const { data, error } = await supabase
    .from("serving_ingredients")
    .insert(rows)
    .select("quantity_g, unit, ingredient:ingredients(name, nutrition, fatsecret_id)")

  if (error) throw error
  return ((data as Record<string, unknown>[]) ?? []).map(mapIngredient)
}

function mapServing(s: Record<string, unknown>): ServingWithIngredients {
  return {
    id: s.id as string,
    recipe_id: s.recipe_id as string,
    name: (s.name as string | null) ?? null,
    price: (s.price as number | null) ?? null,
    calories: (s.calories as number | null) ?? null,
    nutrition: (s.nutrition as Record<string, unknown> | null) ?? null,
    is_active: s.is_active as boolean,
    created_at: s.created_at as string,
    updated_at: s.updated_at as string,
    ingredients: ((s.serving_ingredients as Record<string, unknown>[]) ?? []).map(mapIngredient),
  }
}

function mapIngredient(si: Record<string, unknown>): RecipeIngredientField {
  return {
    name: (si.ingredient as Record<string, unknown>)?.name as string,
    quantity_g: si.quantity_g as number,
    unit: si.unit as string | null,
    nutrition: (si.ingredient as Record<string, unknown>)?.nutrition as Record<string, unknown> | null,
    fatsecret_id: (si.ingredient as Record<string, unknown>)?.fatsecret_id as string | null,
  }
}