import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { createServiceClient } from "@/lib/supabase/service"

const MAX_ATTEMPTS = 10

export async function POST(request: Request) {
  let body: { short_code?: string; pickup_code?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const shortCode = body.short_code?.trim().toUpperCase()
  const pickupCode = body.pickup_code?.trim()
  if (!shortCode || !pickupCode) {
    return Response.json({ error: "short_code and pickup_code are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServiceClient() ?? createClient(cookieStore)

  const { data: delivery, error } = await supabase
    .from("order_deliveries")
    .select("*, orders(*, order_items(*))")
    .eq("short_code", shortCode)
    .single()
  if (error || !delivery) return Response.json({ error: "Order not found" }, { status: 404 })

  const order = delivery.orders as {
    status: string
    subtotal_cents: number
    shipping_cents: number
    vat_cents: number
    currency: string
    created_at: string
    order_items: { name: string; qty: number }[] | null
  }
  const failedAttempts = Number(delivery.failed_attempts ?? 0)
  if (failedAttempts >= MAX_ATTEMPTS) {
    return Response.json({ error: "Too many attempts. Contact support." }, { status: 429 })
  }
  if (delivery.pickup_code !== pickupCode) {
    await supabase
      .from("order_deliveries")
      .update({ failed_attempts: failedAttempts + 1 })
      .eq("id", delivery.id)
    return Response.json({ error: "Incorrect code" }, { status: 401 })
  }
  if (failedAttempts > 0) {
    await supabase.from("order_deliveries").update({ failed_attempts: 0 }).eq("id", delivery.id)
  }
  if (!["out_for_delivery", "delivered"].includes(order.status)) {
    return Response.json({ error: "NOT_READY", status: order.status }, { status: 403 })
  }

  return Response.json({
    short_code: delivery.short_code,
    status: order.status,
    items: (order.order_items ?? []).map((i) => ({ name: i.name, qty: i.qty })),
    subtotal_cents: order.subtotal_cents,
    shipping_cents: order.shipping_cents,
    vat_cents: order.vat_cents,
    currency: order.currency,
    created_at: order.created_at,
  })
}
