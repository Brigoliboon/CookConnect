import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listOrders, createOrder, type CreateOrderItemInput } from "@/lib/supabase/tables/orders"
import { notifyOrderCreated } from "@/lib/notifications/orders"
import type { OrderStatus } from "@/lib/supabase/models"

const ORDER_STATUSES: OrderStatus[] = [
  "inquiry",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
]

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  if (status && !ORDER_STATUSES.includes(status as OrderStatus)) {
    return Response.json(
      { error: `status must be one of: ${ORDER_STATUSES.join(", ")}` },
      { status: 400 },
    )
  }

  try {
    const data = await listOrders(supabase, (status as OrderStatus) ?? undefined)
    return Response.json(data)
  } catch (err) {
    console.error("[API] GET /api/orders error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: {
    name?: string
    email?: string
    mobile_number?: string
    address?: string | null
    location?: { lat: number; lng: number } | null
    shipping_cents?: number
    items?: CreateOrderItemInput[]
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.name?.trim() || !body.email?.trim() || !body.mobile_number?.trim()) {
    return Response.json({ error: "name, email, and mobile_number are required" }, { status: 400 })
  }

  if (!body.items || body.items.length === 0) {
    return Response.json({ error: "At least one item is required" }, { status: 400 })
  }

  const subtotal_cents = body.items.reduce(
    (sum, item) => sum + item.unit_price_cents * item.qty,
    0,
  )

  try {
    const data = await createOrder(
      supabase,
      {
        name: body.name.trim(),
        email: body.email.trim(),
        mobile_number: body.mobile_number.trim(),
        address: body.address ?? null,
        location: body.location ?? null,
        subtotal_cents,
        shipping_cents: body.shipping_cents ?? 0,
      },
      body.items,
    )
    void notifyOrderCreated(supabase, data, body.items.length).catch((err) =>
      console.error("[API] POST /api/orders push failed:", err),
    )
    return Response.json(data, { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/orders error:", err)
    console.error("[API] POST /api/orders detail:", err instanceof Error ? err.stack : null)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}