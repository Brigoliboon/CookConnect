import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: account } = await supabase
    .from("accounts")
    .select("role, name")
    .eq("id", user.id)
    .single()

  if (!account?.role) return null

  return {
    id: user.id,
    email: user.email ?? "",
    name: account.name || user.email?.split("@")[0] || "",
    role: account.role,
  }
}
