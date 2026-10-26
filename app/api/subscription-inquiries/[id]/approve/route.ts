import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { createSubscription } from "@/lib/supabase/tables/subscriptions"
import { recordSubscriptionPayment } from "@/lib/supabase/tables/subscription_payments"

const PLAN_DAYS: Record<string, number> = {
  "standard-15": 15,
  "standard-20": 20,
  "healthy": 30,
  "standard-26": 26,
  "standard-30": 30,
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
  const invite = (details.invite as Record<string, unknown> | undefined) ?? {}
  const agreedPriceCents =
    typeof invite.agreedPriceCents === "number" && Number.isInteger(invite.agreedPriceCents) && invite.agreedPriceCents > 0
      ? invite.agreedPriceCents
      : null

  let totalCents: number
  if (payment.total_cents === undefined || payment.total_cents === null) {
    if (agreedPriceCents === null) {
      return Response.json({ error: "total_cents is required" }, { status: 400 })
    }
    totalCents = agreedPriceCents
  } else {
    totalCents = Math.round(Number(payment.total_cents))
    if (!Number.isFinite(totalCents) || totalCents < 0) {
      return Response.json({ error: "total_cents is invalid" }, { status: 400 })
    }
    if (agreedPriceCents !== null && totalCents !== agreedPriceCents) {
      return Response.json(
        { error: `total_cents must match the agreed price (AED ${(agreedPriceCents / 100).toFixed(2)})` },
        { status: 400 },
      )
    }
  }

  const amountCents = Math.round(Number(payment.amount_cents ?? 0))
  if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > totalCents) {
    return Response.json({ error: "amount_cents must be between 0 and total_cents" }, { status: 400 })
  }

  const customerId: string | null = null

  const planSlug = String(row.plan_id ?? "")
  const validityDays = PLAN_DAYS[planSlug] ?? 30
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, validity_days, details")
    .eq("is_active", true)

  const planRows = (plans ?? []) as {
    id: string
    validity_days: number
    details: { slug?: string } | null
  }[]
  const planRow =
    planRows.find((candidate) => candidate.details?.slug === planSlug) ??
    planRows.find((candidate) => candidate.validity_days === validityDays) ??
    null
  if (!planRow) {
    return Response.json(
      { error: `No active subscription plan matching "${planSlug}" (${validityDays} days)` },
      { status: 400 },
    )
  }

  try {
    const subscription = await createSubscription(supabase, {
      customer_id: customerId,
      subscription_plan_id: planRow.id,
      details: {
        source: "inquiry",
        inquiry_id: id,
        planId: row.plan_id as string,
        name: row.name as string,
        email: (row.email as string | null) ?? null,
        address: row.address as string,
        mobile_number: row.mobile_number as string,
        location: (row.location as { lat: number; lng: number } | null) ?? null,
        total_cents: totalCents,
        ...(details as Record<string, unknown>),
        ...(agreedPriceCents !== null ? { agreed_price_cents: agreedPriceCents } : {}),
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
