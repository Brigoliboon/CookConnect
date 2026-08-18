import { getServing, updateServing, deleteServing, replaceServingIngredients, linkServingIngredients, type ServingIngredientInput } from "@/lib/supabase/tables/servings"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

interface ServingBody {
  name?: string | null
  price?: number | null
  calories?: number | null
  nutrition?: Record<string, unknown> | null
  is_active?: boolean
  ingredients?: ServingIngredientInput[]
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; servingId: string }> },
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: ServingBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const { servingId } = await params
    await updateServing(supabase, servingId, {
      name: body.name,
      price: body.price,
      calories: body.calories,
      nutrition: body.nutrition,
      is_active: body.is_active,
    })

    if (body.ingredients !== undefined) {
      const linkedIngredients = await linkServingIngredients(supabase, body.ingredients)
      await replaceServingIngredients(supabase, servingId, linkedIngredients)
    }

    const updated = await getServing(supabase, servingId)
    return Response.json(updated)
  } catch (err) {
    console.error("[API] PATCH /api/recipe/[id]/servings/[servingId] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; servingId: string }> },
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { servingId } = await params
    await deleteServing(supabase, servingId)
    return Response.json({ success: true })
  } catch (err) {
    console.error("[API] DELETE /api/recipe/[id]/servings/[servingId] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}