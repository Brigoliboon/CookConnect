import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listSubscriptions, createSubscription } from "@/lib/supabase/tables/subscriptions"

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const data = await listSubscriptions(supabase)
    return Response.json(data)
  } catch (err) {
    console.error("[API] GET /api/subscriptions error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: {
    customer_id?: string
    subscription_plan_id?: string
    status?: "active" | "cancelled"
    started_at?: string
    expires_at?: string
    details?: Record<string, unknown>
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.customer_id || !body.subscription_plan_id) {
    return Response.json(
      { error: "customer_id and subscription_plan_id are required" },
      { status: 400 },
    )
  }

  try {
    const data = await createSubscription(supabase, {
      customer_id: body.customer_id,
      subscription_plan_id: body.subscription_plan_id,
      status: body.status,
      started_at: body.started_at,
      expires_at: body.expires_at,
      details: body.details,
    })
    return Response.json(data, { status: 201 })
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === "23P01" || code === "23505") {
      return Response.json(
        { error: "Overlapping subscription period for this customer. Existing entitlement conflicts with the requested dates." },
        { status: 409 },
      )
    }
    console.error("[API] POST /api/subscriptions error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
