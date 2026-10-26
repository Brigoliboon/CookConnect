import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { countOrdersByStatus } from "@/lib/supabase/tables/orders"
import type { OrderStatus } from "@/lib/supabase/models"

const PIPELINE_STATUSES = [
  "inquiry",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
] as const satisfies readonly OrderStatus[]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "employee" && user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const counts = await Promise.all(
      PIPELINE_STATUSES.map((status) => countOrdersByStatus(supabase, status)),
    )
    return Response.json(
      Object.fromEntries(PIPELINE_STATUSES.map((status, index) => [status, counts[index]])),
    )
  } catch (err) {
    console.error("[API] GET /api/dashboard/pipeline error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
