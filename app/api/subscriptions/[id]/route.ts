import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { cancelSubscription } from "@/lib/supabase/tables/subscriptions"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.action !== "cancel") {
    return Response.json({ error: "Only action 'cancel' is supported" }, { status: 400 })
  }

  try {
    const data = await cancelSubscription(supabase, id)
    return Response.json(data)
  } catch (err) {
    console.error("[API] PATCH /api/subscriptions/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
