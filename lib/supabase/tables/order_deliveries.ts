import type { OrderDelivery } from "../models"
import { randomShortCode, randomPickupCode } from "./orders"

export async function assignOrder(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  orderId: string,
  riderId: string,
): Promise<OrderDelivery> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("order_deliveries")
      .insert({
        order_id: orderId,
        rider_id: riderId,
        status: "assigned",
        short_code: randomShortCode(),
        pickup_code: randomPickupCode(),
      })
      .select()
      .single()
    if (!error) return data as OrderDelivery
    const code = (error as { code?: string }).code
    if (code === "23505" && attempt < 2) {
      const { data: existing } = await supabase
        .from("order_deliveries")
        .select("short_code")
        .eq("order_id", orderId)
        .single()
      if (existing) throw error
      continue
    }
    throw error
  }
  throw new Error("Failed to assign order")
}

export async function listDeliveriesForRider(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  riderId: string,
): Promise<OrderDelivery[]> {
  const { data, error } = await supabase
    .from("order_deliveries")
    .select("*")
    .eq("rider_id", riderId)
    .order("assigned_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as OrderDelivery[]
}

export async function completeDelivery(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  orderId: string,
  riderId: string,
): Promise<OrderDelivery> {
  const { data, error } = await supabase
    .from("order_deliveries")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("rider_id", riderId)
    .select()
    .single()
  if (error) throw error
  return data as OrderDelivery
}
