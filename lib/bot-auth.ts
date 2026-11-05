import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceClient } from "@/lib/supabase/service"

export type BotAuthResult =
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; status: number; error: string }

export function getBotClient(request: Request): BotAuthResult {
  const secret = process.env.WHATSAPP_BOT_SECRET
  if (!secret) {
    return { ok: false, status: 500, error: "Bot authentication is not configured" }
  }
  if (request.headers.get("x-bot-secret") !== secret) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }
  const supabase = createServiceClient()
  if (!supabase) {
    return { ok: false, status: 500, error: "Supabase service client is not configured" }
  }
  return { ok: true, supabase }
}
