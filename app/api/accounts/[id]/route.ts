import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const body = await request.json()
    const isActive = body.is_active as boolean
    console.log("[API] PATCH /api/accounts/[id] payload:", { id, isActive })

    const { data, error } = await supabase
      .from("accounts")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()

    console.log("[API] PATCH /api/accounts/[id] supabase result:", { data, error })

    if (error) throw error

    return Response.json({ success: true, data })
  } catch (err) {
    console.error("[API] PATCH /api/accounts/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
