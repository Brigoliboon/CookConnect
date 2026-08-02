import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return Response.json(data ?? [])
  } catch (err) {
    console.error("[API] GET /api/accounts error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: { name: string; email: string; role: string; mobile_number?: string | null; location?: { lat: number; lng: number } | null; subscription_plan_id?: string | null }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.name?.trim() || !body.email?.trim()) {
    return Response.json({ error: "name and email are required" }, { status: 400 })
  }

  if ((body.role ?? "customer") === "customer" && (!body.location || !body.subscription_plan_id)) {
    return Response.json({ error: "location and subscription_plan_id are required for customer accounts" }, { status: 400 })
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: body.email.trim(),
      password: "temporary123",
      options: {
        data: {
          name: body.name.trim(),
          mobile_number: body.mobile_number ?? null,
          role: body.role ?? "customer",
          location: body.location ?? null,
          subscription_plan_id: body.subscription_plan_id ?? null,
        },
      },
    })

    if (error) throw error
    if (!data.user) throw new Error("Signup returned no user")

    return Response.json(data.user, { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/accounts error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}
