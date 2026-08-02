import type { Subscription, SubscriptionPlan } from "../models"

const SUBSCRIPTION_SELECT = "*, customer:accounts(id, name, email), plan:subscription_plans(id, name, validity_days, price_cents, currency)"

export interface SubscriptionWithDetails extends Subscription {
  customer: { id: string; name: string; email: string } | null
  plan: Pick<SubscriptionPlan, "id" | "name" | "validity_days" | "price_cents" | "currency"> | null
}

export type CreateSubscriptionInput = {
  customer_id: string
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
      customer_id: input.customer_id,
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
