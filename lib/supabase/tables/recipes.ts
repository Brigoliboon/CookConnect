import type { Recipe } from "../models"

export type CreateRecipeInput = Pick<Recipe, "name"> & Partial<Omit<Recipe, "id" | "name">>

export interface RecipeWithIngredients extends Recipe {
  ingredients: { name: string; quantity_g: number; unit: string | null }[]
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

export async function listRecipes(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<RecipeWithIngredients[]> {
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(quantity_g, unit, ingredient:ingredients(name))")

  if (error) throw error

  return (recipes as unknown[]).map((r: Record<string, unknown>) => ({
    ...r,
    ingredients: ((r.recipe_ingredients as Record<string, unknown>[]) ?? []).map(
      (ri: Record<string, unknown>) => ({
        name: (ri.ingredient as Record<string, unknown>)?.name as string,
        quantity_g: ri.quantity_g as number,
        unit: ri.unit as string | null,
      }),
    ),
  })) as RecipeWithIngredients[]
}
