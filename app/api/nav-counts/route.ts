import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { countOrdersByStatus } from "@/lib/supabase/tables/orders"
import { countSubscriptionInquiries } from "@/lib/supabase/tables/subscription_inquiries"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "employee" && user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const [orders, subscriptions] = await Promise.all([
      countOrdersByStatus(supabase, "inquiry"),
      countSubscriptionInquiries(supabase),
    ])
    return Response.json({ orders, subscriptions })
  } catch (err) {
    console.error("[API] GET /api/nav-counts error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
