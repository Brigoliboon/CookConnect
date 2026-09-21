import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listPaymentsForSubscription, recordSubscriptionPayment } from "@/lib/supabase/tables/subscription_payments"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const params = new URL(request.url).searchParams
  const subscriptionId = params.get("subscription_id")?.trim()

  try {
    if (subscriptionId) {
      return Response.json({ data: await listPaymentsForSubscription(supabase, subscriptionId) })
    }
    const { data, error } = await supabase
      .from("subscription_payments")
      .select("subscription_id, amount_cents")
      .order("paid_at", { ascending: false })
      .limit(1000)
    if (error) throw error
    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: { subscription_id?: string; amount_cents?: number; method?: string | null; reference?: string | null }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.subscription_id || body.amount_cents === undefined || Number(body.amount_cents) <= 0) {
    return Response.json({ error: "subscription_id and positive amount_cents are required" }, { status: 400 })
  }

  try {
    const data = await recordSubscriptionPayment(supabase, {
      subscription_id: body.subscription_id,
      amount_cents: Math.round(Number(body.amount_cents)),
      method: body.method ?? null,
      reference: body.reference ?? null,
    })
    return Response.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
