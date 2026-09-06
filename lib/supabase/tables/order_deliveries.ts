import type { OrderDelivery } from "../models"

export async function assignOrder(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  orderId: string,
  riderId: string,
): Promise<OrderDelivery> {
  const { data, error } = await supabase
    .from("order_deliveries")
    .insert({ order_id: orderId, rider_id: riderId, status: "assigned" })
    .select()
    .single()
  if (error) throw error
  return data as OrderDelivery
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
