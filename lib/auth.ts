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

export function isEmployeeOrAdminRole(role: string): boolean {
  return role === "employee" || role === "admin"
}

export async function requireEmployeeOrAdmin(): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; response: Response }
> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (!isEmployeeOrAdminRole(user.role)) {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true, user }
}

