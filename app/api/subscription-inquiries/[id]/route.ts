import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { deleteSubscriptionInquiry } from "@/lib/supabase/tables/subscription_inquiries"

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    await deleteSubscriptionInquiry(supabase, id)
    return Response.json({ ok: true })
  } catch (err) {
    console.error("[API] DELETE /api/subscription-inquiries/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
