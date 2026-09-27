import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { setChefSchedule } from "@/lib/supabase/tables/chef_schedules"

function isValidDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: {
    scheduled_date?: string
    assignments?: { subscription_id?: string; recipe_ids?: string[] }[]
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.scheduled_date || !isValidDate(body.scheduled_date)) {
    return Response.json({ error: "scheduled_date (YYYY-MM-DD) is required" }, { status: 400 })
  }
  if (!Array.isArray(body.assignments) || body.assignments.length === 0) {
    return Response.json({ error: "assignments must be a non-empty array" }, { status: 400 })
  }

  try {
    const results = []
    for (const a of body.assignments) {
      if (!a.subscription_id) {
        return Response.json({ error: "Each assignment needs a subscription_id" }, { status: 400 })
      }
      results.push(
        await setChefSchedule(supabase, body.scheduled_date, a.subscription_id, a.recipe_ids ?? []),
      )
    }
    return Response.json(results.flat(), { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/chef-schedules/batch error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
