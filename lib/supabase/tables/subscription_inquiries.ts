export interface SubscriptionInquiry {
  id: string
  plan_id: string
  name: string
  email: string | null
  mobile_number: string
  address: string
  location: { lat: number; lng: number } | null
  details: Record<string, unknown>
  created_at: string
}

export interface CreateSubscriptionInquiryInput {
  plan_id: string
  name: string
  email?: string | null
  mobile_number: string
  address: string
  location?: { lat: number; lng: number } | null
  details?: Record<string, unknown>
}

export async function listSubscriptionInquiries(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<SubscriptionInquiry[]> {
  const { data, error } = await supabase
    .from("subscription_inquiries")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as SubscriptionInquiry[]
}

export async function createSubscriptionInquiry(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateSubscriptionInquiryInput,
): Promise<SubscriptionInquiry> {
  const { data, error } = await supabase
    .from("subscription_inquiries")
    .insert({
      plan_id: input.plan_id,
      name: input.name,
      email: input.email ?? null,
      mobile_number: input.mobile_number,
      address: input.address,
      location: input.location ?? null,
      details: input.details ?? {},
    })
    .select()
    .single()

  if (error) throw error
  return data as SubscriptionInquiry
}
