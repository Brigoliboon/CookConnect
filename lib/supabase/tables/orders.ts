import type { Order, OrderItem, OrderItemAddon, OrderItemModifier, OrderOrigin, OrderStatus } from "../models"
import { resolveMealPrice } from "./recipe_addons"
import { listModifierGroupsForMeal } from "./meal_modifiers"

export interface CreateOrderInput {
  customer_id?: string | null
  name: string
  email: string
  mobile_number: string
  address?: string | null
  origin?: OrderOrigin
  subtotal_cents?: number
  shipping_cents: number
  vat_cents?: number
  currency?: string
  location?: { lat: number; lng: number } | null
  details?: Record<string, unknown>
  status?: OrderStatus
}

export interface CreateOrderItemInput {
  recipe_id: string
  addon_recipe_id?: string | null
  qty: number
  note?: string | null
  option_ids?: string[]
  modifiers?: { option_id?: string }[]
}

/** Client-supplied order input that failed validation — maps to HTTP 400. */
export class OrderInputError extends Error {
  status = 400
  constructor(message: string) {
    super(message)
    this.name = "OrderInputError"
  }
}

const MAX_ITEM_QTY = 100

export interface OrderItemWithAddons extends OrderItem {
  addons: OrderItemAddon[]
  modifiers?: OrderItemModifier[]
}

export interface OrderWithItems extends Order {
  items: OrderItemWithAddons[]
}

export async function listOrders(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  status?: OrderStatus,
  locationOnly?: boolean,
  origin?: OrderOrigin,
  phone?: string,
  limit?: number,
  since?: string,
): Promise<OrderWithItems[]> {
  let query = supabase
    .from("orders")
    .select("*, order_items(*, order_item_addons(*))")

  if (status) {
    query = query.eq("status", status)
  }
  if (since) {
    query = query.gte("delivered_at", since)
  }
  if (locationOnly) {
    query = query.not("location", "is", null)
  }
  if (origin) {
    query = query.eq("origin", origin)
  }
  if (phone) {
    query = query.ilike("mobile_number", `%${phone}%`)
  }
  if (limit && limit > 0) {
    query = query.limit(limit)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error
  return ((data as Record<string, unknown>[]) ?? []).map((o) => {
    const nested = (o.order_items as Record<string, unknown>[] | undefined) ?? []
    return {
      ...(o as unknown as Order),
      ...o,
      items: nested.map((oi) => ({
        ...oi,
        addons: (oi.order_item_addons as OrderItemAddon[] | undefined) ?? [],
      })),
    } as OrderWithItems
  })
}

const SHORT_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function randomShortCode() {
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += SHORT_ALPHABET[Math.floor(Math.random() * SHORT_ALPHABET.length)]
  }
  return code
}

export function randomPickupCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function createOrder(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateOrderInput,
  items: CreateOrderItemInput[],
): Promise<OrderWithItems> {
  if (!items || items.length === 0) throw new OrderInputError("At least one item is required")

  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      const qty = item.qty
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QTY) {
        throw new OrderInputError(`qty must be an integer between 1 and ${MAX_ITEM_QTY}`)
      }
      if (!item.recipe_id || typeof item.recipe_id !== "string") {
        throw new OrderInputError("Each item requires a recipe_id")
      }

      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .select("id, name, image_path, is_active")
        .eq("id", item.recipe_id)
        .maybeSingle()
      if (recipeError) throw recipeError
      if (!recipe) throw new OrderInputError(`Unknown recipe_id: ${item.recipe_id}`)
      if (!recipe.is_active) throw new OrderInputError(`Recipe is not available: ${recipe.name}`)

      let resolved
      try {
        resolved = await resolveMealPrice(supabase, item.recipe_id, item.addon_recipe_id ?? null)
      } catch (err) {
        if (err && typeof err === "object" && "code" in err) throw err
        throw new OrderInputError(err instanceof Error ? err.message : "Unable to price item")
      }

      return {
        recipe_id: item.recipe_id,
        addon_recipe_id: item.addon_recipe_id ?? null,
        addon_name: resolved.addon_name,
        addon_extra_cents: resolved.extra_cents,
        name: recipe.name as string,
        unit_price_cents: resolved.unit_cents,
        qty,
        note: item.note?.trim() || null,
        image_path: (recipe.image_path as string | null) ?? null,
      }
    }),
  )
  const serverSubtotal = resolvedItems.reduce((sum, i) => sum + i.unit_price_cents * i.qty, 0)
  input.subtotal_cents = serverSubtotal
  const vat_cents = input.vat_cents ?? Math.round(input.subtotal_cents * 0.05)
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: input.customer_id ?? null,
      name: input.name,
      email: input.email,
      mobile_number: input.mobile_number,
      address: input.address ?? null,
      status: input.status ?? "inquiry",
      origin: input.origin ?? "web",
      subtotal_cents: input.subtotal_cents,
      shipping_cents: input.shipping_cents,
      vat_cents,
      currency: input.currency ?? "AED",
      details: input.details ?? {},
    })
    .select()
    .single()

  if (error) throw error
  const order = data as Order

  if (input.location) {
    const { error: locError } = await supabase.rpc("set_order_location", {
      order_id: order.id,
      lat: input.location.lat,
      lng: input.location.lng,
    })
    if (locError) throw locError
  }

  const itemRows = resolvedItems.map((item) => ({
    order_id: order.id,
    recipe_id: item.recipe_id,
    name: item.name,
    unit_price_cents: item.unit_price_cents,
    qty: item.qty,
    note: item.note,
    image_path: item.image_path,
  }))

  const { data: createdItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemRows)
    .select()

  if (itemsError) throw itemsError
  const orderItems = (createdItems ?? []) as OrderItem[]

  const addonRows = resolvedItems.flatMap((item, i) =>
    item.addon_recipe_id && item.addon_name
      ? [{
          order_item_id: orderItems[i].id,
          addon_recipe_id: item.addon_recipe_id,
          name: item.addon_name,
          extra_cents: item.addon_extra_cents,
        }]
      : [],
  )
  let createdAddons: OrderItemAddon[] = []
  if (addonRows.length > 0) {
    const { data: addonData, error: addonError } = await supabase
      .from("order_item_addons")
      .insert(addonRows)
      .select()
    if (addonError) throw addonError
    createdAddons = (addonData ?? []) as OrderItemAddon[]
  }

  const itemsWithAddons: OrderItemWithAddons[] = orderItems.map((oi) => ({
    ...oi,
    addons: createdAddons.filter((a) => a.order_item_id === oi.id),
  }))

  return { ...order, items: itemsWithAddons }
}

export async function countOrdersByStatus(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  status: OrderStatus,
  since?: string,
): Promise<number> {
  let query = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", status)

  if (since) {
    query = query.gte("delivered_at", since)
  }

  const { count, error } = await query

  if (error) throw error
  return count ?? 0
}

export async function updateOrderStatus(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
  status: OrderStatus,
): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Order
}

export function itemOptionIds(item: CreateOrderItemInput): string[] {
  if (item.option_ids && item.option_ids.length > 0) {
    return item.option_ids.filter((id) => typeof id === "string" && id.length > 0)
  }
  return (item.modifiers ?? [])
    .map((row) => row.option_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
}

function isModifierInputError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const code = (err as { code?: string }).code
  const message = String((err as { message?: string }).message ?? "")
  return code === "22023" || /pick exactly one option|cannot be ordered|unknown recipe|no active serving|at least one item|name, email, and mobile_number|shipping_cents|qty must/i.test(message)
}

/**
 * Uses create_order_with_modifiers when any item has attached modifier groups
 * or submitted option ids. Meals with no new groups still go through
 * createOrder (legacy recipe_addons). Mixed carts use the RPC for the whole
 * order; legacy add-on extras on those mixed carts are not applied.
 */
export async function createCheckoutOrder(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateOrderInput,
  items: CreateOrderItemInput[],
): Promise<OrderWithItems> {
  if (!items || items.length === 0) throw new OrderInputError("At least one item is required")

  let useRpc = items.some((item) => itemOptionIds(item).length > 0)
  if (!useRpc) {
    for (const item of items) {
      if (!item.recipe_id) continue
      const groups = await listModifierGroupsForMeal(supabase, item.recipe_id, false)
      if (groups.some((group) => group.is_active && group.options.some((option) => option.is_active))) {
        useRpc = true
        break
      }
    }
  }

  if (!useRpc) {
    return createOrder(supabase, input, items)
  }

  const p_order = {
    customer_id: input.customer_id ?? null,
    name: (input.name || "Walk-in").trim() || "Walk-in",
    email: (input.email || "").trim() || "-",
    mobile_number: (input.mobile_number || "").trim() || "-",
    address: input.address ?? null,
    status: input.status ?? "inquiry",
    origin: input.origin ?? "web",
    shipping_cents: input.shipping_cents ?? 0,
    currency: input.currency ?? "AED",
    details: input.details ?? {},
  }

  const p_items = items.map((item) => ({
    recipe_id: item.recipe_id,
    qty: item.qty,
    note: item.note ?? null,
    option_ids: itemOptionIds(item),
  }))

  const { data, error } = await supabase.rpc("create_order_with_modifiers", { p_order, p_items })
  if (error) {
    if (isModifierInputError(error)) {
      throw new OrderInputError(error.message)
    }
    throw error
  }

  const payload = data as Record<string, unknown>
  const order = payload as unknown as Order

  if (input.location) {
    const { error: locError } = await supabase.rpc("set_order_location", {
      order_id: order.id,
      lat: input.location.lat,
      lng: input.location.lng,
    })
    if (locError) throw locError
  }

  const rawItems = (payload.items as Record<string, unknown>[] | undefined) ?? []
  const itemsWithAddons: OrderItemWithAddons[] = rawItems.map((row) => {
    const modifiers = (row.modifiers as OrderItemModifier[] | undefined) ?? []
    return {
      id: row.id as string,
      order_id: order.id,
      recipe_id: (row.recipe_id as string | null) ?? null,
      name: String(row.name ?? ""),
      unit_price_cents: Number(row.unit_price_cents ?? 0),
      qty: Number(row.qty ?? 1),
      note: (row.note as string | null) ?? null,
      image_path: (row.image_path as string | null) ?? null,
      addons: [],
      modifiers,
    }
  })

  return { ...order, items: itemsWithAddons }
}
