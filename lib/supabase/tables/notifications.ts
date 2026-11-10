import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppNotification } from "../models"

export interface NotificationFeed {
  notifications: AppNotification[]
  unreadCount: number
}

export async function listNotifications(
  client: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<NotificationFeed> {
  const [listResult, countResult] = await Promise.all([
    client
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .is("read_at", null),
  ])

  if (listResult.error) throw listResult.error
  if (countResult.error) throw countResult.error

  return {
    notifications: (listResult.data ?? []) as AppNotification[],
    unreadCount: countResult.count ?? 0,
  }
}

export async function markNotificationsRead(
  client: SupabaseClient,
  userId: string,
  ids?: string[],
): Promise<number> {
  let query = client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", userId)
    .is("read_at", null)

  if (ids) {
    if (ids.length === 0) return 0
    query = query.in("id", ids)
  }

  const { data, error } = await query.select("id")
  if (error) throw error
  return data?.length ?? 0
}
