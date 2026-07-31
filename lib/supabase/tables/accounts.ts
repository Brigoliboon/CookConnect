import type { Account } from "../models"

export async function listAccounts(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as Account[]
}

export interface CreateAccountInput {
  name: string
  email: string
  role: Account["role"]
}

export async function createAccount(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: CreateAccountInput,
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      role: input.role,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data as Account
}
