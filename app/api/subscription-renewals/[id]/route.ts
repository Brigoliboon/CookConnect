import { getBotClient } from "@/lib/bot-auth"
import { markRenewalReminderSent } from "@/lib/supabase/tables/subscriptions"
import { serializeLifecycleSubscription } from "@/lib/subscription/lifecycle"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getBotClient(request)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  let body: { expires_at?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const expiresAt = typeof body.expires_at === "string" ? body.expires_at.trim() : undefined
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    return Response.json({ error: "expires_at must be a valid ISO date" }, { status: 400 })
  }

  try {
    const row = await markRenewalReminderSent(auth.supabase, id, expiresAt)
    if (!row) return Response.json({ error: "Subscription not found" }, { status: 404 })
    return Response.json(serializeLifecycleSubscription(row))
  } catch (err) {
    console.error("[API] PATCH /api/subscription-renewals/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
