import type { Order, OrderItem, OrderItemAddon, OrderStatus } from "../models"
import { resolveMealPrice } from "./recipe_addons"

export interface CreateOrderInput {
  customer_id?: string | null
  name: string
  email: string
  mobile_number: string
  address?: string | null
  subtotal_cents: number
  shipping_cents: number
  vat_cents?: number
  currency?: string
  location?: { lat: number; lng: number } | null
  details?: Record<string, unknown>
}

export interface CreateOrderItemInput {
  recipe_id?: string | null
  addon_recipe_id?: string | null
  name: string
  unit_price_cents: number
  qty: number
  note?: string | null
  image_path?: string | null
}

export interface OrderItemWithAddons extends OrderItem {
  addons: OrderItemAddon[]
}

export interface OrderWithItems extends Order {
  items: OrderItemWithAddons[]
}

export async function listOrders(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  status?: OrderStatus,
  locationOnly?: boolean,
): Promise<OrderWithItems[]> {
  let query = supabase
    .from("orders")
    .select("*, order_items(*, order_item_addons(*))")

  if (status) {
    query = query.eq("status", status)
  }
  if (locationOnly) {
    query = query.not("location", "is", null)
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
  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      if (item.recipe_id) {
        const resolved = await resolveMealPrice(supabase, item.recipe_id, item.addon_recipe_id ?? null)
        return {
          recipe_id: item.recipe_id,
          addon_recipe_id: item.addon_recipe_id ?? null,
          addon_name: resolved.addon_name,
          addon_extra_cents: resolved.extra_cents,
          name: item.name,
          unit_price_cents: resolved.unit_cents,
          qty: item.qty,
          note: item.note ?? null,
          image_path: item.image_path ?? null,
        }
      }
      return {
        recipe_id: null,
        addon_recipe_id: null,
        addon_name: null,
        addon_extra_cents: 0,
        name: item.name,
        unit_price_cents: item.unit_price_cents,
        qty: item.qty,
        note: item.note ?? null,
        image_path: item.image_path ?? null,
      }
    }),
  )
  const serverSubtotal = resolvedItems.reduce((sum, i) => sum + i.unit_price_cents * i.qty, 0)
  if (serverSubtotal !== input.subtotal_cents) input.subtotal_cents = serverSubtotal
  const vat_cents = input.vat_cents ?? Math.round(input.subtotal_cents * 0.05)
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: input.customer_id ?? null,
      name: input.name,
      email: input.email,
      mobile_number: input.mobile_number,
      address: input.address ?? null,
      status: "inquiry",
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