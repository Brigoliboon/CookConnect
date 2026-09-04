import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { updateOrderStatus } from "@/lib/supabase/tables/orders"
import { notifyOrderStatusChanged } from "@/lib/notifications/orders"
import type { OrderStatus } from "@/lib/supabase/models"

const ORDER_STATUSES: OrderStatus[] = [
  "inquiry",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
]

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.status || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
    return Response.json(
      { error: `status must be one of: ${ORDER_STATUSES.join(", ")}` },
      { status: 400 },
    )
  }

  try {
    const data = await updateOrderStatus(supabase, id, body.status as OrderStatus)
    void notifyOrderStatusChanged(supabase, data).catch((err) =>
      console.error("[API] PATCH /api/orders/[id] push failed:", err),
    )
    return Response.json(data)
  } catch (err) {
    console.error("[API] PATCH /api/orders/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
