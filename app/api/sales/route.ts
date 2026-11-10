import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { getSalesSummary, validateSalesRange } from "@/lib/supabase/tables/sales"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin" && user.role !== "employee") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const rangeError = validateSalesRange(from, to)
  if (rangeError) {
    return Response.json({ error: rangeError }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const data = await getSalesSummary(supabase, { from, to })
    return Response.json(data)
  } catch (err) {
    console.error("[API] GET /api/sales error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
