import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listOrders, createOrder, type CreateOrderItemInput } from "@/lib/supabase/tables/orders"
import { notifyOrderCreated } from "@/lib/notifications/orders"
import { inferOrderOrigin } from "@/lib/orders/origin"
import type { OrderOrigin, OrderStatus } from "@/lib/supabase/models"

const ORDER_STATUSES: OrderStatus[] = [
  "inquiry",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
]

const ORDER_ORIGINS: OrderOrigin[] = ["web", "pos", "whatsapp"]

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const locationOnly = searchParams.get("location_only") === "true"
  const origin = searchParams.get("origin")

  if (status && !ORDER_STATUSES.includes(status as OrderStatus)) {
    return Response.json(
      { error: `status must be one of: ${ORDER_STATUSES.join(", ")}` },
      { status: 400 },
    )
  }

  if (origin && !ORDER_ORIGINS.includes(origin as OrderOrigin)) {
    return Response.json(
      { error: `origin must be one of: ${ORDER_ORIGINS.join(", ")}` },
      { status: 400 },
    )
  }

  try {
    const data = await listOrders(
      supabase,
      (status as OrderStatus) ?? undefined,
      locationOnly,
      (origin as OrderOrigin) ?? undefined,
    )
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

  if (!body.items || body.items.length === 0) {
    return Response.json({ error: "At least one item is required" }, { status: 400 })
  }

  // Name/mobile are optional (e.g. dine-in walk-ins). Defaults keep NOT NULL
  // columns happy without polluting records with fake contact details.
  const name = body.name?.trim() || "Walk-in"
  const mobile_number = body.mobile_number?.trim() || ""

  const subtotal_cents = body.items.reduce(
    (sum, item) => sum + item.unit_price_cents * item.qty,
    0,
  )

  const referer = request.headers.get("referer")
  let role: string | null = null
  if (!referer) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: account } = await supabase
        .from("accounts")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
      role = (account as { role?: string } | null)?.role ?? null
    }
  }
  const origin = inferOrderOrigin({
    botSecretHeader: request.headers.get("x-bot-secret"),
    referer,
    role,
  })

  try {
    const data = await createOrder(
      supabase,
      {
        name,
        email: body.email?.trim() ?? "",
        mobile_number,
        address: body.address ?? null,
        origin,
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