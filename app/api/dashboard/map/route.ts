import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import type { OrderStatus } from "@/lib/supabase/models"

const MAP_STATUSES = [
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
    const { data, error } = await supabase
      .from("orders")
      .select("id, name, status, address, location")
      .in("status", MAP_STATUSES)
      .not("location", "is", null)
      .order("created_at", { ascending: true })

    if (error) throw error
    return Response.json(data ?? [])
  } catch (err) {
    console.error("[API] GET /api/dashboard/map error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
