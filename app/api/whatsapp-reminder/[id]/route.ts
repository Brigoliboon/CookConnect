import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { createServiceClient } from "@/lib/supabase/service"
import { markReminderSent } from "@/lib/supabase/tables/whatsapp_reminders"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const secret = process.env.WHATSAPP_BOT_SECRET
  let supabase = null
  if (secret && request.headers.get("x-bot-secret") === secret) {
    supabase = createServiceClient()
  }
  if (!supabase) {
    const cookieStore = await cookies()
    supabase = createClient(cookieStore)
  }
  try {
    const row = await markReminderSent(supabase, id)
    return Response.json(row)
  } catch (err) {
    console.error("[API] PATCH /api/whatsapp-reminder/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
