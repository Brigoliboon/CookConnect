import type { Order, OrderItem, OrderStatus } from "../models"

export interface CreateOrderInput {
  customer_id?: string | null
  name: string
  email: string
  mobile_number: string
  address?: string | null
  subtotal_cents: number
  shipping_cents: number
  currency?: string
  location?: { lat: number; lng: number } | null
  details?: Record<string, unknown>
}

export interface CreateOrderItemInput {
  recipe_id?: string | null
  name: string
  unit_price_cents: number
  qty: number
  note?: string | null
  image_path?: string | null
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

export async function listOrders(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  status?: OrderStatus,
): Promise<OrderWithItems[]> {
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as OrderWithItems[]
}

export async function createOrder(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateOrderInput,
  items: CreateOrderItemInput[],
): Promise<OrderWithItems> {
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

  const itemRows = items.map((item) => ({
    order_id: order.id,
    recipe_id: item.recipe_id ?? null,
    name: item.name,
    unit_price_cents: item.unit_price_cents,
    qty: item.qty,
    note: item.note ?? null,
    image_path: item.image_path ?? null,
  }))

  const { data: createdItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemRows)
    .select()

  if (itemsError) throw itemsError

  return { ...order, items: (createdItems ?? []) as OrderItem[] }
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