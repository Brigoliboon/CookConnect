import type { Recipe } from "../models"

export type CreateRecipeInput = Pick<Recipe, "name"> & Partial<Omit<Recipe, "id" | "name">>

export interface RecipeWithIngredients extends Recipe {
  ingredients: { name: string; quantity_g: number; unit: string | null; nutrition: Record<string, unknown> | null; fatsecret_id: string | null }[]
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
      price: input.price ?? null,
      calories: input.calories ?? null,
      is_active: input.is_active ?? true,
      nutrition: input.nutrition ?? null,
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
): Promise<RecipeWithIngredients[]> {
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(quantity_g, unit, ingredient:ingredients(name, nutrition, fatsecret_id))")

  if (error) throw error

  return (recipes as Record<string, unknown>[]).map((r) => ({
    ...r,
    ingredients: ((r.recipe_ingredients as Record<string, unknown>[]) ?? []).map(
      (ri: Record<string, unknown>) => ({
        name: (ri.ingredient as Record<string, unknown>)?.name as string,
        quantity_g: ri.quantity_g as number,
        unit: ri.unit as string | null,
        nutrition: (ri.ingredient as Record<string, unknown>)?.nutrition as Record<string, unknown> | null,
        fatsecret_id: (ri.ingredient as Record<string, unknown>)?.fatsecret_id as string | null,
      }),
    ),
  })) as RecipeWithIngredients[]
}
