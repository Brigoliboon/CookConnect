import { getBotClient } from "@/lib/bot-auth"
import { listSubscriptionsDueForRenewal } from "@/lib/supabase/tables/subscriptions"
import { serializeLifecycleSubscription } from "@/lib/subscription/lifecycle"

export async function GET(request: Request) {
  const auth = getBotClient(request)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? 3) || 3, 1), 90)
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50) || 50, 1), 200)

  try {
    const rows = await listSubscriptionsDueForRenewal(auth.supabase, days, limit)
    return Response.json(rows.map(serializeLifecycleSubscription))
  } catch (err) {
    console.error("[API] GET /api/subscription-renewals error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
