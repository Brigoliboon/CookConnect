import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listIngredients } from "@/lib/supabase/tables/ingredients"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const params = new URL(request.url).searchParams

  try {
    const idsRaw = params.get("ids")?.trim()
    const ids = idsRaw ? idsRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined
    const data = await listIngredients(supabase, {
      search: params.get("search")?.trim() || undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : 50,
      ids,
    })
    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
