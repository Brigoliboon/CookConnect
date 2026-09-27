import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { cancelSubscription, pauseSubscription, resumeSubscription } from "@/lib/supabase/tables/subscriptions"

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

  if (body.action !== "cancel" && body.action !== "pause" && body.action !== "resume") {
    return Response.json({ error: "Only actions 'cancel', 'pause' and 'resume' are supported" }, { status: 400 })
  }

  try {
    const data =
      body.action === "cancel"
        ? await cancelSubscription(supabase, id)
        : body.action === "pause"
          ? await pauseSubscription(supabase, id)
          : await resumeSubscription(supabase, id)
    return Response.json(data)
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === "23P01" || code === "23505") {
      return Response.json(
        { error: "Resuming would overlap another subscription period for this customer." },
        { status: 409 },
      )
    }
    console.error("[API] PATCH /api/subscriptions/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
