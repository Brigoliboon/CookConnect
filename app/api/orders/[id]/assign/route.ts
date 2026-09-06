import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { updateOrderStatus } from "@/lib/supabase/tables/orders"
import { assignOrder, completeDelivery } from "@/lib/supabase/tables/order_deliveries"
import { notifyOrderStatusChanged } from "@/lib/notifications/orders"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", id)
      .single()
    if (orderError || !order) return Response.json({ error: "Order not found" }, { status: 404 })
    if (order.status !== "ready_for_pickup") {
      return Response.json({ error: `Order is ${order.status}, only ready_for_pickup orders can be taken` }, { status: 409 })
    }

    try {
      await assignOrder(supabase, id, user.id)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === "23505") return Response.json({ error: "Order already taken" }, { status: 409 })
      throw err
    }

    const data = await updateOrderStatus(supabase, id, "out_for_delivery")
    void notifyOrderStatusChanged(supabase, data).catch((err) =>
      console.error("[API] POST /api/orders/[id]/assign push failed:", err),
    )
    return Response.json(data)
  } catch (err) {
    console.error("[API] POST /api/orders/[id]/assign error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await completeDelivery(supabase, id, user.id)
    const data = await updateOrderStatus(supabase, id, "delivered")
    void notifyOrderStatusChanged(supabase, data).catch((err) =>
      console.error("[API] PATCH /api/orders/[id]/assign push failed:", err),
    )
    return Response.json(data)
  } catch (err) {
    console.error("[API] PATCH /api/orders/[id]/assign error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
