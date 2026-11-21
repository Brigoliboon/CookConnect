import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

const STAFF_ROLES = ["employee"]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!STAFF_ROLES.includes(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 })

  const cookieStore = await cookies()
  const supabase = createServiceClient() ?? createClient(cookieStore)
  const { data, error } = await supabase
    .from("accounts")
    .select("email_notifications")
    .eq("id", user.id)
    .maybeSingle()
  if (error) {
    console.error("[API] GET /api/notifications/email error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ enabled: Boolean((data as { email_notifications?: boolean } | null)?.email_notifications) })
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!STAFF_ROLES.includes(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 })

  let body: { enabled?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (typeof body.enabled !== "boolean") {
    return Response.json({ error: "enabled must be a boolean" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServiceClient() ?? createClient(cookieStore)
  const { error } = await supabase
    .from("accounts")
    .update({ email_notifications: body.enabled })
    .eq("id", user.id)
  if (error) {
    console.error("[API] PATCH /api/notifications/email error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ enabled: body.enabled })
}
