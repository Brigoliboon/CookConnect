import { createServing, listServingsForRecipe, linkServingIngredients, type ServingIngredientInput } from "@/lib/supabase/tables/servings"
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const { id } = await params
    const servings = await listServingsForRecipe(supabase, id)
    return Response.json(servings)
  } catch (err) {
    console.error("[API] GET /api/recipe/[id]/servings error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
    const { id } = await params
    const linkedIngredients = await linkServingIngredients(supabase, body.ingredients ?? [])
    const serving = await createServing(
      supabase,
      id,
      {
        name: body.name ?? null,
        price: body.price ?? null,
        calories: body.calories ?? null,
        nutrition: body.nutrition ?? null,
        is_active: body.is_active ?? true,
      },
      linkedIngredients,
    )
    return Response.json(serving, { status: 201 })
  } catch (err) {
    console.error("[API] POST /api/recipe/[id]/servings error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}