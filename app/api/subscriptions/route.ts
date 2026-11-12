import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listActivePlanRows, PLAN_DAYS, resolveActivePlan } from "@/lib/subscription/plan"
import { listSubscriptions, createSubscription } from "@/lib/supabase/tables/subscriptions"
import { recordSubscriptionPayment } from "@/lib/supabase/tables/subscription_payments"

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
    customer_id?: string | null
    subscription_plan_id?: string
    status?: "active" | "cancelled"
    started_at?: string
    expires_at?: string
    details?: Record<string, unknown>
    total_cents?: number
    amount_cents?: number
    method?: string | null
    reference?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const planSlug =
    typeof body.details?.planId === "string" ? body.details.planId : ""

  let planId = body.subscription_plan_id
  if (!planId) {
    if (!planSlug) {
      return Response.json(
        { error: "subscription_plan_id or details.planId is required" },
        { status: 400 },
      )
    }
    try {
      const planRow = resolveActivePlan(await listActivePlanRows(supabase), planSlug)
      if (!planRow) {
        const validityDays = PLAN_DAYS[planSlug] ?? 30
        return Response.json(
          { error: `No active subscription plan matching "${planSlug}" (${validityDays} days)` },
          { status: 400 },
        )
      }
      planId = planRow.id
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load subscription plans"
      return Response.json({ error: message }, { status: 500 })
    }
  }

  const amountCents = Math.round(Number(body.amount_cents ?? 0))
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    return Response.json({ error: "amount_cents is invalid" }, { status: 400 })
  }

  try {
    const data = await createSubscription(supabase, {
      customer_id: body.customer_id ?? null,
      subscription_plan_id: planId,
      status: body.status,
      started_at: body.started_at,
      expires_at: body.expires_at,
      details: body.details,
    })
    if (amountCents > 0) {
      await recordSubscriptionPayment(supabase, {
        subscription_id: data.id,
        amount_cents: amountCents,
        method: body.method ?? null,
        reference: body.reference ?? null,
      })
    }
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
