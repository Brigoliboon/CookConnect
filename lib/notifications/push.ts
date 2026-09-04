import webpush from "web-push"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceClient } from "@/lib/supabase/service"
import type { NotificationType, PushPayload, RoleTarget, StoredSubscription } from "./types"

function vapidConfigured() {
  return Boolean(
    process.env.PUSH_VAPID_PUBLIC_KEY &&
      process.env.PUSH_VAPID_PRIVATE_KEY &&
      process.env.PUSH_VAPID_SUBJECT,
  )
}

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.PUSH_VAPID_SUBJECT!,
    process.env.PUSH_VAPID_PUBLIC_KEY!,
    process.env.PUSH_VAPID_PRIVATE_KEY!,
  )
}

export async function getSubscriptionsForRoles(
  requestClient: SupabaseClient,
  roles: RoleTarget[],
): Promise<StoredSubscription[]> {
  const privileged = createServiceClient() ?? requestClient
  const { data, error } = await privileged
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id, accounts!inner(role, is_active)")
    .in("accounts.role", roles)
    .eq("accounts.is_active", true)
  if (error) throw error
  return (data ?? []) as unknown as StoredSubscription[]
}

export async function sendPushToRoles(
  requestClient: SupabaseClient,
  roles: RoleTarget[],
  type: NotificationType,
  payload: PushPayload,
): Promise<void> {
  if (!vapidConfigured()) {
    console.error("[push] VAPID env missing, skipping push")
    return
  }
  let subs: StoredSubscription[]
  try {
    subs = await getSubscriptionsForRoles(requestClient, roles)
  } catch (err) {
    console.error("[push] subscription lookup failed:", err)
    return
  }
  if (subs.length === 0) {
    console.log(`[push] no subscriptions for roles: ${roles.join(",")}`)
    return
  }
  configureWebPush()
  const privileged = createServiceClient() ?? requestClient
  const recipientIds = [...new Set(subs.map((s) => s.user_id))]
  try {
    await privileged.from("notifications").insert(
      recipientIds.map((recipient_user_id) => ({
        recipient_user_id,
        type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      })),
    )
  } catch (err) {
    console.error("[push] notifications insert failed:", err)
  }
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ),
    ),
  )
  const deadEndpoints = subs
    .filter((_, i) => {
      const r = results[i]
      if (r.status === "fulfilled") return false
      const statusCode = (r.reason as { statusCode?: number })?.statusCode
      return statusCode === 404 || statusCode === 410
    })
    .map((s) => s.endpoint)
  if (deadEndpoints.length > 0) {
    try {
      await privileged.from("push_subscriptions").delete().in("endpoint", deadEndpoints)
    } catch (err) {
      console.error("[push] dead subscription cleanup failed:", err)
    }
  }
}
