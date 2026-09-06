import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listDeliveriesForRider } from "@/lib/supabase/tables/order_deliveries"

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const assignments = await listDeliveriesForRider(supabase, user.id)
    const active = assignments.filter((a) => a.status === "assigned")
    if (active.length === 0) return Response.json([])
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .in(
        "id",
        active.map((a) => a.order_id),
      )
    if (error) throw error
    const byId = new Map(((orders ?? []) as { id: string }[]).map((o) => [o.id, o]))
    return Response.json(
      active
        .map((a) => ({ assignment: a, order: byId.get(a.order_id) ?? null }))
        .filter((r) => r.order !== null),
    )
  } catch (err) {
    console.error("[API] GET /api/deliveries/mine error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
