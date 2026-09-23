import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listChefSchedules, setChefSchedule } from "@/lib/supabase/tables/chef_schedules"

function isValidDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") ?? ""

  if (!isValidDate(date)) {
    return Response.json({ error: "date (YYYY-MM-DD) is required" }, { status: 400 })
  }

  try {
    const data = await listChefSchedules(supabase, date)
    return Response.json(data)
  } catch (err) {
    console.error("[API] GET /api/chef-schedules error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: { scheduled_date?: string; subscription_id?: string; recipe_ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.scheduled_date || !isValidDate(body.scheduled_date)) {
    return Response.json({ error: "scheduled_date (YYYY-MM-DD) is required" }, { status: 400 })
  }
  if (!body.subscription_id) {
    return Response.json({ error: "subscription_id is required" }, { status: 400 })
  }

  try {
    const data = await setChefSchedule(
      supabase,
      body.scheduled_date,
      body.subscription_id,
      body.recipe_ids ?? [],
    )
    return Response.json(data, { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/chef-schedules error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
