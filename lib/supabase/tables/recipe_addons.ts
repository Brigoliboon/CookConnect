import type { OrderItemAddon, RecipeAddon } from "../models"

export interface RecipeAddonOption extends RecipeAddon {
  addon_name: string
  addon_image_path: string | null
  addon_category: string | null
}

export interface CreateRecipeAddonInput {
  meal_recipe_id: string
  addon_recipe_id: string
  extra_cents?: number
  is_default?: boolean
  is_active?: boolean
}

export async function listAddonsForMeal(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  mealRecipeId: string,
): Promise<RecipeAddonOption[]> {
  const { data, error } = await supabase
    .from("recipe_addons")
    .select("*, addon:recipes!recipe_addons_addon_recipe_id_fkey(name, image_path, category)")
    .eq("meal_recipe_id", mealRecipeId)
    .eq("is_active", true)
    .order("extra_cents", { ascending: true })

  if (error) throw error
  return ((data as Record<string, unknown>[]) ?? []).map((r) => ({
    id: r.id as string,
    meal_recipe_id: r.meal_recipe_id as string,
    addon_recipe_id: r.addon_recipe_id as string,
    extra_cents: r.extra_cents as number,
    is_default: r.is_default as boolean,
    is_active: r.is_active as boolean,
    created_at: r.created_at as string,
    addon_name: ((r.addon as Record<string, unknown>)?.name as string) ?? "",
    addon_image_path: ((r.addon as Record<string, unknown>)?.image_path as string | null) ?? null,
    addon_category: ((r.addon as Record<string, unknown>)?.category as string | null) ?? null,
  }))
}

export async function createRecipeAddon(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateRecipeAddonInput,
): Promise<RecipeAddon> {
  const { data, error } = await supabase
    .from("recipe_addons")
    .insert({
      meal_recipe_id: input.meal_recipe_id,
      addon_recipe_id: input.addon_recipe_id,
      extra_cents: input.extra_cents ?? 0,
      is_default: input.is_default ?? false,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data as RecipeAddon
}

export async function updateRecipeAddon(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
  input: Partial<CreateRecipeAddonInput>,
): Promise<RecipeAddon> {
  const { data, error } = await supabase
    .from("recipe_addons")
    .update({ ...input })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as RecipeAddon
}

export async function deleteRecipeAddon(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("recipe_addons").delete().eq("id", id)
  if (error) throw error
}

export interface ResolvedMealPrice {
  base_cents: number
  extra_cents: number
  unit_cents: number
  addon_name: string | null
}

export async function resolveMealPrice(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  mealRecipeId: string,
  addonRecipeId?: string | null,
): Promise<ResolvedMealPrice> {
  const { data: servings, error: servingError } = await supabase
    .from("servings")
    .select("price")
    .eq("recipe_id", mealRecipeId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)

  if (servingError) throw servingError
  const basePrice = (servings?.[0] as Record<string, unknown> | undefined)?.price as number | null
  if (basePrice === null || basePrice === undefined) throw new Error("Meal has no active serving price")
  const base_cents = Math.round(Number(basePrice) * 100)

  if (!addonRecipeId) return { base_cents, extra_cents: 0, unit_cents: base_cents, addon_name: null }

  const { data: addon, error: addonError } = await supabase
    .from("recipe_addons")
    .select("extra_cents, addon:recipes!recipe_addons_addon_recipe_id_fkey(name)")
    .eq("meal_recipe_id", mealRecipeId)
    .eq("addon_recipe_id", addonRecipeId)
    .eq("is_active", true)
    .single()

  if (addonError) throw new Error("Invalid side selection for this meal")
  const row = addon as Record<string, unknown>
  const extra_cents = Number(row.extra_cents ?? 0)
  const addon_name = ((row.addon as Record<string, unknown>)?.name as string) ?? null
  return { base_cents, extra_cents, unit_cents: base_cents + extra_cents, addon_name }
}

export async function listAddonsForOrderItem(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  orderItemId: string,
): Promise<OrderItemAddon[]> {
  const { data, error } = await supabase
    .from("order_item_addons")
    .select("*")
    .eq("order_item_id", orderItemId)

  if (error) throw error
  return (data ?? []) as OrderItemAddon[]
}
