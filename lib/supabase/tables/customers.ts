import type { Account } from "../models"

export async function listCustomers(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as Account[]
}
