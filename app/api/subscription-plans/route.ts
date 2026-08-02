import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listActivePlans } from "@/lib/supabase/tables/subscription_plans"

export async function GET(request: Request) {
  console.log("[TEMP] subscription-plans headers:", Object.fromEntries(request.headers.entries()))

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const plans = await listActivePlans(supabase)
    return Response.json(plans)
  } catch (err) {
    console.error("[API] GET /api/subscription-plans error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
