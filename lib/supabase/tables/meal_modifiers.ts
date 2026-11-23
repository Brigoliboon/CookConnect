import type { SupabaseClient } from "@supabase/supabase-js"
import type { MealModifierGroup, MealModifierOption } from "../models"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function mapPgError(err: unknown): ApiError | null {
  const message = err instanceof Error ? err.message : String(err ?? "")
  if (
    message.includes("Modifier groups cannot be attached to subscription meals")
    || message.includes("Detach modifier groups before marking a meal as subscription-included")
  ) {
    return new ApiError(
      400,
      "This database still has the old subscription-meal block. Run supabase/migrations/20261124010000_meal_modifiers_allow_subscription_meals.sql, then try again.",
    )
  }
  if (
    message.includes("idx_meal_modifier_options_active_name")
    || (message.includes("duplicate key") && message.includes("meal_modifier_options"))
  ) {
    return new ApiError(400, "An active option with this name already exists in the group.")
  }
  if (message.includes("meal_modifier_options_price_cents_check") || message.includes("price_cents")) {
    if (message.toLowerCase().includes("violates check")) {
      return new ApiError(400, "price_cents must be zero or greater.")
    }
  }
  if (message.includes("meal_modifier_options_recipe_id_fkey") || message.includes("recipes")) {
    if (message.toLowerCase().includes("foreign key") || message.includes("23503")) {
      return new ApiError(400, "Unknown recipe_id")
    }
  }
  return null
}

export function jsonFromUnknown(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  const mapped = mapPgError(err)
  if (mapped) {
    return Response.json({ error: mapped.message }, { status: mapped.status })
  }
  console.error("[API] meal-modifiers error:", err)
  const message = err instanceof Error ? err.message : "Internal server error"
  return Response.json({ error: message }, { status: 500 })
}

export interface MealModifierOptionView extends MealModifierOption {
  recipe_name: string | null
}

export interface MealModifierGroupView extends MealModifierGroup {
  options: MealModifierOptionView[]
}

function mapOption(row: Record<string, unknown>): MealModifierOptionView {
  const recipe = row.recipe as Record<string, unknown> | null | undefined
  return {
    id: row.id as string,
    group_id: row.group_id as string,
    recipe_id: (row.recipe_id as string | null) ?? null,
    name: row.name as string,
    name_ar: (row.name_ar as string | null) ?? null,
    price_cents: Number(row.price_cents ?? 0),
    is_default: Boolean(row.is_default),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    recipe_name: (recipe?.name as string | null) ?? null,
  }
}

function mapGroup(row: Record<string, unknown>, includeInactive: boolean): MealModifierGroupView {
  const rawOptions = (row.options as Record<string, unknown>[] | undefined) ?? []
  const options = rawOptions
    .map(mapOption)
    .filter((option) => includeInactive || option.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  return {
    id: row.id as string,
    name: row.name as string,
    name_ar: (row.name_ar as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    options,
  }
}

const OPTION_SELECT = "*, recipe:recipes!meal_modifier_options_recipe_id_fkey(name)"
const GROUP_SELECT = `*, options:meal_modifier_options(${OPTION_SELECT})`

export async function listModifierGroups(
  supabase: SupabaseClient,
  includeInactive: boolean,
): Promise<MealModifierGroupView[]> {
  let query = supabase
    .from("meal_modifier_groups")
    .select(GROUP_SELECT)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (!includeInactive) query = query.eq("is_active", true)

  const { data, error } = await query
  if (error) throw error
  return ((data as Record<string, unknown>[]) ?? [])
    .map((row) => mapGroup(row, includeInactive))
}

export async function listModifierGroupsForMeal(
  supabase: SupabaseClient,
  mealRecipeId: string,
  includeInactive: boolean,
): Promise<MealModifierGroupView[]> {
  const { data, error } = await supabase
    .from("meal_modifier_group_links")
    .select(`sort_order, group:meal_modifier_groups(${GROUP_SELECT})`)
    .eq("meal_recipe_id", mealRecipeId)
    .order("sort_order", { ascending: true })

  if (error) throw error

  const groups: MealModifierGroupView[] = []
  for (const row of (data as Record<string, unknown>[] | null) ?? []) {
    const groupRow = row.group as Record<string, unknown> | null
    if (!groupRow) continue
    if (!includeInactive && groupRow.is_active === false) continue
    const group = mapGroup(groupRow, includeInactive)
    group.sort_order = Number(row.sort_order ?? group.sort_order)
    groups.push(group)
  }
  return groups
}

export interface ModifierGroupInput {
  name: string
  name_ar?: string | null
  sort_order?: number
  is_active?: boolean
}

export function parseGroupInput(body: Record<string, unknown>, partial = false): ModifierGroupInput {
  const input: ModifierGroupInput = { name: "" }
  if ("name" in body || !partial) {
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) throw new ApiError(400, "name is required")
    input.name = name
  }
  if ("name_ar" in body) {
    const raw = body.name_ar
    if (raw == null) input.name_ar = null
    else if (typeof raw === "string") input.name_ar = raw.trim() || null
    else throw new ApiError(400, "name_ar must be a string")
  }
  if ("sort_order" in body) {
    const value = Number(body.sort_order)
    if (!Number.isInteger(value)) throw new ApiError(400, "sort_order must be an integer")
    input.sort_order = value
  }
  if ("is_active" in body) {
    if (typeof body.is_active !== "boolean") throw new ApiError(400, "is_active must be a boolean")
    input.is_active = body.is_active
  }
  return input
}

export async function createModifierGroup(
  supabase: SupabaseClient,
  input: ModifierGroupInput,
): Promise<MealModifierGroupView> {
  const { data, error } = await supabase
    .from("meal_modifier_groups")
    .insert({
      name: input.name,
      name_ar: input.name_ar ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select(GROUP_SELECT)
    .single()

  if (error) throw error
  return mapGroup(data as Record<string, unknown>, true)
}

export async function updateModifierGroup(
  supabase: SupabaseClient,
  id: string,
  input: ModifierGroupInput,
): Promise<MealModifierGroupView> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name) patch.name = input.name
  if ("name_ar" in input) patch.name_ar = input.name_ar ?? null
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order
  if (input.is_active !== undefined) patch.is_active = input.is_active

  const { data, error } = await supabase
    .from("meal_modifier_groups")
    .update(patch)
    .eq("id", id)
    .select(GROUP_SELECT)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ApiError(404, "Modifier group not found")
  return mapGroup(data as Record<string, unknown>, true)
}

export async function deleteModifierGroup(supabase: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await supabase
    .from("meal_modifier_groups")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, "Modifier group not found")
}

export interface ModifierOptionInput {
  group_id?: string
  name?: string
  name_ar?: string | null
  recipe_id?: string | null
  price_cents?: number
  is_default?: boolean
  sort_order?: number
  is_active?: boolean
}

export function parseOptionInput(body: Record<string, unknown>, partial = false): ModifierOptionInput {
  const input: ModifierOptionInput = {}
  if ("group_id" in body || !partial) {
    const groupId = typeof body.group_id === "string" ? body.group_id.trim() : ""
    if (!groupId || !isUuid(groupId)) throw new ApiError(400, "group_id is required")
    input.group_id = groupId
  }
  if ("name" in body || !partial) {
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) throw new ApiError(400, "name is required")
    input.name = name
  }
  if ("name_ar" in body) {
    const raw = body.name_ar
    if (raw == null) input.name_ar = null
    else if (typeof raw === "string") input.name_ar = raw.trim() || null
    else throw new ApiError(400, "name_ar must be a string")
  }
  if ("recipe_id" in body) {
    if (body.recipe_id == null || body.recipe_id === "") input.recipe_id = null
    else if (typeof body.recipe_id === "string" && isUuid(body.recipe_id)) input.recipe_id = body.recipe_id
    else throw new ApiError(400, "recipe_id must be a valid id or null")
  }
  if ("price_cents" in body || !partial) {
    if ("price_cents" in body || !partial) {
      const raw = body.price_cents
      const value = raw === undefined || raw === null || raw === "" ? 0 : Number(raw)
      if (!Number.isInteger(value) || value < 0) throw new ApiError(400, "price_cents must be an integer of zero or greater")
      input.price_cents = value
    }
  }
  if ("is_default" in body) {
    if (typeof body.is_default !== "boolean") throw new ApiError(400, "is_default must be a boolean")
    input.is_default = body.is_default
  }
  if ("sort_order" in body) {
    const value = Number(body.sort_order)
    if (!Number.isInteger(value)) throw new ApiError(400, "sort_order must be an integer")
    input.sort_order = value
  }
  if ("is_active" in body) {
    if (typeof body.is_active !== "boolean") throw new ApiError(400, "is_active must be a boolean")
    input.is_active = body.is_active
  }
  return input
}

async function assertRecipeExists(supabase: SupabaseClient, recipeId: string): Promise<void> {
  const { data, error } = await supabase.from("recipes").select("id").eq("id", recipeId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(400, "Unknown recipe_id")
}

async function assertGroupExists(supabase: SupabaseClient, groupId: string): Promise<void> {
  const { data, error } = await supabase.from("meal_modifier_groups").select("id").eq("id", groupId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, "Modifier group not found")
}

export async function createModifierOption(
  supabase: SupabaseClient,
  input: ModifierOptionInput,
): Promise<MealModifierOptionView> {
  if (!input.group_id || !input.name) throw new ApiError(400, "group_id and name are required")
  await assertGroupExists(supabase, input.group_id)
  if (input.recipe_id) await assertRecipeExists(supabase, input.recipe_id)

  const { data, error } = await supabase
    .from("meal_modifier_options")
    .insert({
      group_id: input.group_id,
      name: input.name,
      name_ar: input.name_ar ?? null,
      recipe_id: input.recipe_id ?? null,
      price_cents: input.price_cents ?? 0,
      is_default: input.is_default ?? false,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select(OPTION_SELECT)
    .single()

  if (error) throw error
  return mapOption(data as Record<string, unknown>)
}

export async function updateModifierOption(
  supabase: SupabaseClient,
  id: string,
  input: ModifierOptionInput,
): Promise<MealModifierOptionView> {
  if (input.recipe_id) await assertRecipeExists(supabase, input.recipe_id)
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name) patch.name = input.name
  if ("name_ar" in input) patch.name_ar = input.name_ar ?? null
  if ("recipe_id" in input) patch.recipe_id = input.recipe_id ?? null
  if (input.price_cents !== undefined) patch.price_cents = input.price_cents
  if (input.is_default !== undefined) patch.is_default = input.is_default
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order
  if (input.is_active !== undefined) patch.is_active = input.is_active

  const { data, error } = await supabase
    .from("meal_modifier_options")
    .update(patch)
    .eq("id", id)
    .select(OPTION_SELECT)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ApiError(404, "Modifier option not found")
  return mapOption(data as Record<string, unknown>)
}

export async function deleteModifierOption(supabase: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await supabase
    .from("meal_modifier_options")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, "Modifier option not found")
}

export async function replaceMealModifierLinks(
  supabase: SupabaseClient,
  mealRecipeId: string,
  groupIds: string[],
): Promise<MealModifierGroupView[]> {
  if (!isUuid(mealRecipeId)) throw new ApiError(400, "meal_recipe_id is invalid")

  const { data: meal, error: mealError } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", mealRecipeId)
    .maybeSingle()
  if (mealError) throw mealError
  if (!meal) throw new ApiError(404, "Meal not found")

  const unique: string[] = []
  for (const raw of groupIds) {
    if (typeof raw !== "string" || !isUuid(raw)) throw new ApiError(400, "group_ids must be a list of valid ids")
    if (!unique.includes(raw)) unique.push(raw)
  }

  if (unique.length > 0) {
    const { data: groups, error: groupError } = await supabase
      .from("meal_modifier_groups")
      .select("id")
      .in("id", unique)
    if (groupError) throw groupError
    if ((groups?.length ?? 0) !== unique.length) throw new ApiError(404, "Unknown modifier group")
  }

  const { data: existing, error: existingError } = await supabase
    .from("meal_modifier_group_links")
    .select("id, group_id")
    .eq("meal_recipe_id", mealRecipeId)
  if (existingError) throw existingError

  const existingIds = new Set(((existing as { group_id: string }[]) ?? []).map((row) => row.group_id))
  const nextIds = new Set(unique)
  const toDelete = ((existing as { id: string; group_id: string }[]) ?? [])
    .filter((row) => !nextIds.has(row.group_id))
    .map((row) => row.id)

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("meal_modifier_group_links")
      .delete()
      .in("id", toDelete)
    if (deleteError) throw deleteError
  }

  const toInsert = unique.filter((id) => !existingIds.has(id))
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("meal_modifier_group_links").insert(
      toInsert.map((group_id) => ({
        meal_recipe_id: mealRecipeId,
        group_id,
        sort_order: unique.indexOf(group_id),
      })),
    )
    if (insertError) throw insertError
  }

  for (let i = 0; i < unique.length; i += 1) {
    const groupId = unique[i]
    if (toInsert.includes(groupId)) continue
    const { error: updateError } = await supabase
      .from("meal_modifier_group_links")
      .update({ sort_order: i })
      .eq("meal_recipe_id", mealRecipeId)
      .eq("group_id", groupId)
    if (updateError) throw updateError
  }

  return listModifierGroupsForMeal(supabase, mealRecipeId, true)
}
