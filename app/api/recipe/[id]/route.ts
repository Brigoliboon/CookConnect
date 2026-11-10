import { updateRecipe, deleteRecipe, getRecipe, type CreateRecipeInput } from "@/lib/supabase/tables/recipes"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS })
  }

  const { id } = await params

  let body: Partial<CreateRecipeInput>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_STORE_HEADERS })
  }

  try {
    await updateRecipe(supabase, id, body)

    const updated = await getRecipe(supabase, id)
    return Response.json(updated, { headers: NO_STORE_HEADERS })
  } catch (err) {
    console.error("[API] PATCH /api/recipe/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500, headers: NO_STORE_HEADERS })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS })
  }

  const { id } = await params

  try {
    await deleteRecipe(supabase, id)
    return Response.json({ success: true }, { headers: NO_STORE_HEADERS })
  } catch (err) {
    console.error("[API] DELETE /api/recipe/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500, headers: NO_STORE_HEADERS })
  }
}
