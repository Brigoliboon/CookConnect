import { updateRecipe, deleteRecipe, getRecipe, type CreateRecipeInput } from "@/lib/supabase/tables/recipes"
import { replaceServingIngredients, linkServingIngredients, type ServingIngredientInput } from "@/lib/supabase/tables/servings"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  type PatchBody = Partial<CreateRecipeInput> & {
    servings?: {
      id?: string | null
      name?: string | null
      price?: number | null
      calories?: number | null
      nutrition?: Record<string, unknown> | null
      is_active?: boolean
      ingredients?: ServingIngredientInput[]
    }[]
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const { servings: newServings, ...recipeFields } = body

    await updateRecipe(supabase, id, recipeFields)

    if (newServings !== undefined) {
      for (const serving of newServings) {
        if (serving.id) {
          const linkedIngredients = await linkServingIngredients(supabase, serving.ingredients ?? [])
          await replaceServingIngredients(supabase, serving.id, linkedIngredients)
        }
      }
    }

    const updated = await getRecipe(supabase, id)
    return Response.json(updated)
  } catch (err) {
    console.error("[API] PATCH /api/recipe/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
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
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    await deleteRecipe(supabase, id)
    return Response.json({ success: true })
  } catch (err) {
    console.error("[API] DELETE /api/recipe/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}
