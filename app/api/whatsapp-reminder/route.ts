import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { createServiceClient } from "@/lib/supabase/service"
import {
  enqueueReminder,
  listPendingReminders,
  listSentReminders,
  type ReminderKind,
} from "@/lib/supabase/tables/whatsapp_reminders"

function botClient(request: Request) {
  const secret = process.env.WHATSAPP_BOT_SECRET
  if (secret && request.headers.get("x-bot-secret") === secret) {
    return createServiceClient()
  }
  return null
}

const KINDS: ReminderKind[] = ["order", "subscription"]

export async function POST(request: Request) {
  let body: { phone?: string; kind?: string; reference_id?: string; type?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.phone?.trim() || !body.reference_id?.trim() || !body.type?.trim()) {
    return Response.json({ error: "phone, reference_id and type are required" }, { status: 400 })
  }
  if (!body.kind || !KINDS.includes(body.kind as ReminderKind)) {
    return Response.json({ error: "kind must be one of: order, subscription" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = botClient(request) ?? createClient(cookieStore)
  try {
    const row = await enqueueReminder(supabase, {
      phone: body.phone.trim(),
      kind: body.kind as ReminderKind,
      reference_id: body.reference_id.trim(),
      type: body.type.trim(),
    })
    return Response.json(row, { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/whatsapp-reminder error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "pending"
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20) || 20, 1), 100)

  if (!["pending", "sent", "all"].includes(status)) {
    return Response.json({ error: "status must be one of: pending, sent, all" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = botClient(request) ?? createClient(cookieStore)
  try {
    if (status === "sent") return Response.json(await listSentReminders(supabase, limit))
    if (status === "all") {
      const [pending, sent] = await Promise.all([
        listPendingReminders(supabase, limit),
        listSentReminders(supabase, limit),
      ])
      return Response.json({ pending, sent })
    }
    return Response.json(await listPendingReminders(supabase, limit))
  } catch (err) {
    console.error("[API] GET /api/whatsapp-reminder error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
