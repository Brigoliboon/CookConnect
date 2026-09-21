import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { createSubscription } from "@/lib/supabase/tables/subscriptions"
import { recordSubscriptionPayment } from "@/lib/supabase/tables/subscription_payments"

const PLAN_DAYS: Record<string, number> = {
  "standard-15": 15,
  "standard-20": 20,
  "healthy": 30,
  "standard-26": 26,
  "standard-45": 45,
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let payment: { total_cents?: number; amount_cents?: number; method?: string | null; reference?: string | null } = {}
  try {
    payment = await request.json()
  } catch {
    payment = {}
  }

  if (payment.total_cents === undefined || payment.total_cents === null || Number(payment.total_cents) < 0) {
    return Response.json({ error: "total_cents is required" }, { status: 400 })
  }
  const totalCents = Math.round(Number(payment.total_cents))
  const amountCents = Math.round(Number(payment.amount_cents ?? 0))
  if (!Number.isFinite(totalCents) || !Number.isFinite(amountCents) || amountCents < 0 || amountCents > totalCents) {
    return Response.json({ error: "amount_cents must be between 0 and total_cents" }, { status: 400 })
  }

  const { data: inquiry, error: inqError } = await supabase
    .from("subscription_inquiries")
    .select("*")
    .eq("id", id)
    .single()

  if (inqError || !inquiry) {
    return Response.json({ error: "Inquiry not found" }, { status: 404 })
  }

  const row = inquiry as Record<string, unknown>
  const details = (row.details as Record<string, unknown>) ?? {}

  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("mobile_number", row.mobile_number as string)
    .maybeSingle()

  let customerId = (existing as { id: string } | null)?.id
  if (!customerId) {
    const { data: account, error: accError } = await supabase
      .from("accounts")
      .insert({
        name: row.name as string,
        email: (row.email as string | null) ?? `${(row.mobile_number as string).replace(/\D/g, "")}@guest.local`,
        mobile_number: row.mobile_number as string,
        role: "customer",
        is_active: true,
      })
      .select("id")
      .single()
    if (accError) return Response.json({ error: accError.message }, { status: 500 })
    customerId = (account as { id: string }).id
  }

  const validityDays = PLAN_DAYS[row.plan_id as string] ?? 30
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("validity_days", validityDays)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  const planRow = plan as { id: string } | null
  if (!planRow) {
    return Response.json({ error: `No active subscription plan with ${validityDays} validity days` }, { status: 400 })
  }

  try {
    const subscription = await createSubscription(supabase, {
      customer_id: customerId,
      subscription_plan_id: planRow.id,
      details: {
        source: "inquiry",
        inquiry_id: id,
        planId: row.plan_id as string,
        address: row.address as string,
        mobile_number: row.mobile_number as string,
        location: (row.location as { lat: number; lng: number } | null) ?? null,
        total_cents: totalCents,
        ...(details as Record<string, unknown>),
      },
    })
    if (amountCents > 0) {
      await recordSubscriptionPayment(supabase, {
        subscription_id: subscription.id,
        amount_cents: amountCents,
        method: payment.method ?? null,
        reference: payment.reference ?? null,
      })
    }
    await supabase.from("subscription_inquiries").delete().eq("id", id)
    return Response.json({ subscription, total_cents: totalCents, paid_cents: amountCents }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
