import { getBotClient } from "@/lib/bot-auth"
import {
  findActiveSubscriptionByPhone,
  getSubscription,
  recordNonRenewalReason,
} from "@/lib/supabase/tables/subscriptions"
import { serializeLifecycleSubscription } from "@/lib/subscription/lifecycle"

export async function POST(request: Request) {
  const auth = getBotClient(request)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  let body: { subscription_id?: string; phone?: string; reason?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason) return Response.json({ error: "reason is required" }, { status: 400 })
  if (reason.length > 4000) {
    return Response.json({ error: "reason is too long" }, { status: 400 })
  }

  try {
    let row = null
    if (body.subscription_id?.trim()) {
      const found = await getSubscription(auth.supabase, body.subscription_id.trim())
      if (!found) return Response.json({ error: "Subscription not found" }, { status: 404 })
    } else if (body.phone?.trim()) {
      row = await findActiveSubscriptionByPhone(auth.supabase, body.phone.trim())
      if (!row) return Response.json({ error: "No subscription found for this phone" }, { status: 404 })
    } else {
      return Response.json({ error: "subscription_id or phone is required" }, { status: 400 })
    }

    const updated = await recordNonRenewalReason(
      auth.supabase,
      row?.id ?? body.subscription_id!.trim(),
      reason,
    )
    if (!updated) return Response.json({ error: "Subscription not found" }, { status: 404 })
    return Response.json(serializeLifecycleSubscription(updated), { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/subscription-non-renewal error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
