import type { SupabaseClient } from "@supabase/supabase-js"

export type ReminderKind = "order" | "subscription"

export interface WhatsAppReminder {
  id: string
  phone: string
  kind: ReminderKind
  reference_id: string
  type: string
  sent_at: string | null
  created_at: string
}

export async function enqueueReminder(
  supabase: SupabaseClient,
  input: { phone: string; kind: ReminderKind; reference_id: string; type: string },
): Promise<WhatsAppReminder> {
  const { data, error } = await supabase
    .from("whatsapp_reminders")
    .upsert(
      {
        phone: input.phone,
        kind: input.kind,
        reference_id: input.reference_id,
        type: input.type,
      },
      { onConflict: "kind,reference_id,type" },
    )
    .select()
    .single()
  if (error) throw error
  return data as WhatsAppReminder
}

export async function listPendingReminders(
  supabase: SupabaseClient,
  limit: number,
): Promise<WhatsAppReminder[]> {
  const { data, error } = await supabase
    .from("whatsapp_reminders")
    .select("*")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as WhatsAppReminder[]
}

export async function listSentReminders(
  supabase: SupabaseClient,
  limit: number,
): Promise<WhatsAppReminder[]> {
  const { data, error } = await supabase
    .from("whatsapp_reminders")
    .select("*")
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as WhatsAppReminder[]
}

export async function markReminderSent(
  supabase: SupabaseClient,
  id: string,
): Promise<WhatsAppReminder> {
  const { data, error } = await supabase
    .from("whatsapp_reminders")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as WhatsAppReminder
}
