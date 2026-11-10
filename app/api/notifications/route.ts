import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { listNotifications, markNotificationsRead } from "@/lib/supabase/tables/notifications"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit")
  let limit = DEFAULT_LIMIT
  if (limitParam) {
    const parsed = Number(limitParam)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return Response.json(
        { error: `limit must be an integer between 1 and ${MAX_LIMIT}` },
        { status: 400 },
      )
    }
    limit = parsed
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const data = await listNotifications(supabase, user.id, limit)
    return Response.json(data)
  } catch (err) {
    console.error("[API] GET /api/notifications error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let body: { ids?: unknown; all?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const markAll = body.all === true
  let ids: string[] | undefined
  if (!markAll) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return Response.json({ error: "Provide ids or all: true" }, { status: 400 })
    }
    if (!body.ids.every((id) => typeof id === "string" && id.length > 0)) {
      return Response.json({ error: "ids must be an array of notification ids" }, { status: 400 })
    }
    ids = body.ids as string[]
  }

  const cookieStore = await cookies()
  const supabase = createServiceClient() ?? createClient(cookieStore)

  try {
    const updated = await markNotificationsRead(supabase, user.id, ids)
    return Response.json({ updated })
  } catch (err) {
    console.error("[API] PATCH /api/notifications error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
