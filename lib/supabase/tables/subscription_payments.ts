import type { SubscriptionPayment } from "../models"

export interface CreateSubscriptionPaymentInput {
  subscription_id: string
  amount_cents: number
  method?: string | null
  reference?: string | null
  paid_at?: string
}

export async function listPaymentsForSubscription(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  subscriptionId: string,
): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("paid_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as SubscriptionPayment[]
}

export async function recordSubscriptionPayment(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateSubscriptionPaymentInput,
): Promise<SubscriptionPayment> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .insert({
      subscription_id: input.subscription_id,
      amount_cents: input.amount_cents,
      method: input.method ?? null,
      reference: input.reference ?? null,
      paid_at: input.paid_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as SubscriptionPayment
}

export function paymentStatus(totalCents: number, paidCents: number): "unpaid" | "partial" | "paid" {
  if (paidCents <= 0) return "unpaid"
  if (paidCents < totalCents) return "partial"
  return "paid"
}
