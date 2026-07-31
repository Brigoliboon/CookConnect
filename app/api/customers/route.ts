import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("role", "customer")
      .order("created_at", { ascending: false })

    if (error) throw error
    return Response.json(data ?? [])
  } catch (err) {
    console.error("[API] GET /api/customers error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
