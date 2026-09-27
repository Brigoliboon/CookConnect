import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listDailyStandards, setDailyStandard } from "@/lib/supabase/tables/daily_standards"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") ?? ""
  const planId = searchParams.get("plan_id") ?? undefined
  const mealsRaw = searchParams.get("meals_per_day")
  const mealsPerDay = mealsRaw !== null ? Number(mealsRaw) : undefined

  try {
    const data = await listDailyStandards(supabase, date, planId, mealsPerDay)
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    const status = message.includes("YYYY-MM-DD") ? 400 : 500
    if (status === 500) console.error("[API] GET /api/daily-standards error:", err)
    return Response.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: {
    standard_date?: string
    subscription_plan_id?: string
    meals_per_day?: number
    recipe_ids?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.standard_date || !body.subscription_plan_id) {
    return Response.json({ error: "standard_date and subscription_plan_id are required" }, { status: 400 })
  }
  const mealsPerDay = Math.min(4, Math.max(1, Math.round(body.meals_per_day ?? 1)))

  try {
    const data = await setDailyStandard(
      supabase,
      body.standard_date,
      body.subscription_plan_id,
      mealsPerDay,
      body.recipe_ids ?? [],
    )
    return Response.json(data, { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/daily-standards error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
