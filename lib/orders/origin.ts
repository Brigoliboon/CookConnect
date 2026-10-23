import type { OrderOrigin } from "@/lib/supabase/models"

export interface OriginSignals {
  botSecretHeader?: string | null
  referer?: string | null
  role?: string | null
}

export function inferOrderOrigin(signals: OriginSignals): OrderOrigin {
  const secret = process.env.WHATSAPP_BOT_SECRET
  if (secret && signals.botSecretHeader && signals.botSecretHeader === secret) {
    return "whatsapp"
  }
  if (signals.referer) {
    return signals.referer.includes("/employee/") ? "pos" : "web"
  }
  if (signals.role === "admin" || signals.role === "employee") return "pos"
  return "web"
}
