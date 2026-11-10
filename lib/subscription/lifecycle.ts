import type { SubscriptionLifecycleRow } from "@/lib/supabase/tables/subscriptions"

export function normalizePhone(raw: unknown): string {
  const defaultCountry = process.env.DEFAULT_COUNTRY_CODE || "971"
  let digits = String(raw ?? "").replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  else if (digits.startsWith("0")) digits = defaultCountry + digits.slice(1)
  return digits
}

export function subscriptionPhone(row: SubscriptionLifecycleRow): string | null {
  const details = (row.details as Record<string, unknown> | null) ?? {}
  const fromDetails = typeof details.mobile_number === "string" ? details.mobile_number.trim() : ""
  if (fromDetails) return fromDetails
  const fromAccount = typeof row.customer?.mobile_number === "string" ? row.customer.mobile_number.trim() : ""
  return fromAccount || null
}

export function subscriptionPlanSlug(row: SubscriptionLifecycleRow): string | null {
  const details = (row.details as Record<string, unknown> | null) ?? {}
  const fromPlan = row.plan?.details?.slug
  if (typeof fromPlan === "string" && fromPlan.trim()) return fromPlan.trim()
  const fromDetails = details.planId ?? details.plan_id
  return typeof fromDetails === "string" && fromDetails.trim() ? fromDetails.trim() : null
}

export function serializeLifecycleSubscription(row: SubscriptionLifecycleRow) {
  const preferences = (row.details as Record<string, unknown> | null) ?? {}
  const prefName = typeof preferences.name === "string" ? preferences.name : null
  return {
    id: row.id,
    subscription_id: row.id,
    customer_id: row.customer_id,
    customer_name: prefName || row.customer?.name || null,
    phone: subscriptionPhone(row),
    plan: row.plan
      ? {
          id: row.plan.id,
          name: row.plan.name,
          slug: subscriptionPlanSlug(row),
          validity_days: row.plan.validity_days,
          currency: row.plan.currency,
        }
      : null,
    started_at: row.started_at,
    expires_at: row.expires_at,
    preferences,
    renewal_reminder_sent_at: row.renewal_reminder_sent_at ?? null,
    renewal_reminder_expires_at: row.renewal_reminder_expires_at ?? null,
    non_renewal_reason: row.non_renewal_reason ?? null,
    non_renewal_reason_at: row.non_renewal_reason_at ?? null,
  }
}
