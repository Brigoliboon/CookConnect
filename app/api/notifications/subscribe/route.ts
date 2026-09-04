import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

interface SubscribeBody {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
  userAgent?: string
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let body: SubscribeBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return Response.json({ error: "endpoint, keys.p256dh and keys.auth are required" }, { status: 400 })
  }

  const row = {
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: body.userAgent ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error: deleteError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
  if (deleteError) {
    console.error("[API] POST /api/notifications/subscribe delete failed:", deleteError)
    return Response.json({ error: deleteError.message }, { status: 500 })
  }
  const { error } = await supabase.from("push_subscriptions").insert(row)
  if (error) {
    console.error("[API] POST /api/notifications/subscribe insert failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let body: { endpoint?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.endpoint) return Response.json({ error: "endpoint is required" }, { status: 400 })

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
