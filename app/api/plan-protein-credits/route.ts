import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listProteinCredits, setProteinCredits } from "@/lib/supabase/tables/plan_protein_credits"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { searchParams } = new URL(request.url)
  const planId = searchParams.get("plan_id") ?? undefined

  try {
    const data = await listProteinCredits(supabase, planId)
    return Response.json(data)
  } catch (err) {
    console.error("[API] GET /api/plan-protein-credits error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: { subscription_plan_id?: string; credits?: { ingredient_id?: string; allowance?: number }[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.subscription_plan_id) {
    return Response.json({ error: "subscription_plan_id is required" }, { status: 400 })
  }

  try {
    const data = await setProteinCredits(
      supabase,
      body.subscription_plan_id,
      (body.credits ?? []).map((c) => ({
        ingredient_id: c.ingredient_id ?? "",
        allowance: c.allowance ?? 0,
      })),
    )
    return Response.json(data, { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/plan-protein-credits error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
