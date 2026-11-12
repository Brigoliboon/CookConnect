import type { Subscription, SubscriptionPlan } from "../models"
import { normalizePhone } from "@/lib/subscription/lifecycle"

const SUBSCRIPTION_SELECT = "*, customer:accounts(id, name, email), plan:subscription_plans(id, name, validity_days, price_cents, currency)"
const LIFECYCLE_SELECT =
  "*, customer:accounts(id, name, email, mobile_number), plan:subscription_plans(id, name, validity_days, price_cents, currency, details)"

export interface SubscriptionWithDetails extends Subscription {
  customer: { id: string; name: string; email: string } | null
  plan: Pick<SubscriptionPlan, "id" | "name" | "validity_days" | "price_cents" | "currency"> | null
}

export interface SubscriptionLifecycleRow extends Subscription {
  customer: { id: string; name: string; email: string; mobile_number: string | null } | null
  plan: Pick<SubscriptionPlan, "id" | "name" | "validity_days" | "price_cents" | "currency" | "details"> | null
  renewal_reminder_sent_at: string | null
  renewal_reminder_expires_at: string | null
  non_renewal_reason: string | null
  non_renewal_reason_at: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

export type CreateSubscriptionInput = {
  customer_id?: string | null
  subscription_plan_id: string
  status?: Subscription["status"]
  started_at?: string
  expires_at?: string
  details?: Record<string, unknown>
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export async function listSubscriptions(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<SubscriptionWithDetails[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as SubscriptionWithDetails[]) ?? []
}

export async function listSubscriptionsForCustomer(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  customerId: string,
): Promise<SubscriptionWithDetails[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as SubscriptionWithDetails[]) ?? []
}

export async function getSubscription(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<SubscriptionWithDetails | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as SubscriptionWithDetails | null
}

export async function createSubscription(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  const startedAt = input.started_at ?? new Date().toISOString()

  let expiresAt = input.expires_at
  if (!expiresAt) {
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("validity_days")
      .eq("id", input.subscription_plan_id)
      .maybeSingle()
    const days = (plan as { validity_days: number } | null)?.validity_days ?? 30
    expiresAt = addDays(startedAt, days)
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      customer_id: input.customer_id ?? null,
      subscription_plan_id: input.subscription_plan_id,
      status: input.status ?? "active",
      started_at: startedAt,
      expires_at: expiresAt,
      details: input.details ?? {},
    })
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

const EDITABLE_DETAIL_KEYS = ["name", "email", "mobile_number", "address"] as const

export async function updateSubscriptionDetails(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<Subscription> {
  const current = await getSubscription(supabase, id)
  if (!current) throw new Error("Subscription not found")

  const next: Record<string, unknown> = { ...((current.details as Record<string, unknown> | null) ?? {}) }
  for (const key of EDITABLE_DETAIL_KEYS) {
    if (!(key in patch)) continue
    next[key] = patch[key]
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ details: next })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

export async function cancelSubscription(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

export async function pauseSubscription(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ paused_at: new Date().toISOString() })
    .eq("id", id)
    .is("paused_at", null)
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

export async function resumeSubscription(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
): Promise<Subscription> {
  const current = await getSubscription(supabase, id)
  if (!current) throw new Error("Subscription not found")

  let expiresAt = current.expires_at
  const pausedAt = (current as Subscription).paused_at
  if (pausedAt) {
    const pausedMs = Date.now() - new Date(pausedAt).getTime()
    if (pausedMs > 0) {
      expiresAt = new Date(new Date(expiresAt).getTime() + pausedMs).toISOString()
    }
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ paused_at: null, expires_at: expiresAt })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

function reminderAlreadySent(row: SubscriptionLifecycleRow): boolean {
  if (!row.renewal_reminder_sent_at || !row.renewal_reminder_expires_at) return false
  return new Date(row.renewal_reminder_expires_at).getTime() === new Date(row.expires_at).getTime()
}

export async function listSubscriptionsDueForRenewal(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  days: number,
  limit: number,
): Promise<SubscriptionLifecycleRow[]> {
  const now = new Date()
  const cutoff = new Date(now.getTime() + days * DAY_MS)

  const { data, error } = await supabase
    .from("subscriptions")
    .select(LIFECYCLE_SELECT)
    .eq("status", "active")
    .is("paused_at", null)
    .gte("expires_at", now.toISOString())
    .lte("expires_at", cutoff.toISOString())
    .order("expires_at", { ascending: true })
    .limit(Math.max(limit * 5, 100))

  if (error) throw error
  return ((data ?? []) as SubscriptionLifecycleRow[])
    .filter((row) => !reminderAlreadySent(row))
    .slice(0, limit)
}

export async function markRenewalReminderSent(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
  expiresAt?: string,
): Promise<SubscriptionLifecycleRow | null> {
  let reminderFor = expiresAt
  if (!reminderFor) {
    const current = await getSubscription(supabase, id)
    if (!current) return null
    reminderFor = current.expires_at
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      renewal_reminder_sent_at: new Date().toISOString(),
      renewal_reminder_expires_at: reminderFor,
    })
    .eq("id", id)
    .select(LIFECYCLE_SELECT)
    .maybeSingle()

  if (error) throw error
  return (data as SubscriptionLifecycleRow | null) ?? null
}

export async function findActiveSubscriptionByPhone(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  phone: string,
): Promise<SubscriptionLifecycleRow | null> {
  const target = normalizePhone(phone)
  if (!target) return null

  for (const status of ["active", undefined] as const) {
    let query = supabase.from("subscriptions").select(LIFECYCLE_SELECT)
    if (status) query = query.eq("status", status)
    const { data, error } = await query
      .order("expires_at", { ascending: false })
      .limit(200)
    if (error) throw error

    const rows = (data ?? []) as SubscriptionLifecycleRow[]
    const match = rows.find((row) => {
      const details = (row.details as Record<string, unknown> | null) ?? {}
      const candidates = [details.mobile_number, row.customer?.mobile_number]
      return candidates.some((value) => normalizePhone(value) === target)
    })
    if (match) return match
  }

  return null
}

export async function recordNonRenewalReason(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  id: string,
  reason: string,
): Promise<SubscriptionLifecycleRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      non_renewal_reason: reason,
      non_renewal_reason_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(LIFECYCLE_SELECT)
    .maybeSingle()

  if (error) throw error
  return (data as SubscriptionLifecycleRow | null) ?? null
}
