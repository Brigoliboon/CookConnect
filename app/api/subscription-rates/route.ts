import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { getSubscriptionPlanRate } from "@/lib/supabase/tables/subscription_plan_rates"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const plan = searchParams.get("plan")?.trim()
  const mealsPerDay = Number(searchParams.get("meals_per_day"))

  if (!plan) {
    return Response.json({ error: "plan is required" }, { status: 400 })
  }
  if (!Number.isInteger(mealsPerDay) || mealsPerDay < 1 || mealsPerDay > 5) {
    return Response.json({ error: "meals_per_day must be an integer between 1 and 5" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const rate = await getSubscriptionPlanRate(supabase, plan, mealsPerDay)
    if (!rate) {
      return Response.json({ error: `No active rate for ${plan} at ${mealsPerDay} meals/day` }, { status: 404 })
    }
    return Response.json(rate)
  } catch (err) {
    console.error("[API] GET /api/subscription-rates error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
