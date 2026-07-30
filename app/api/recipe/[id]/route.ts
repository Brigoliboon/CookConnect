import { updateRecipe, deleteRecipe, type CreateRecipeInput } from "@/lib/supabase/tables/recipes"
import { upsertIngredient, linkIngredient, unlinkRecipeIngredients } from "@/lib/supabase/tables/ingredients"
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

  let body: Partial<CreateRecipeInput> & { ingredients?: { name: string; quantity_g: number; unit: string | null }[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const { ingredients: newIngredients, ...recipeFields } = body

    const recipe = await updateRecipe(supabase, id, recipeFields)

    if (newIngredients !== undefined) {
      await unlinkRecipeIngredients(supabase, id)
      for (const ing of newIngredients) {
        const ingredient = await upsertIngredient(supabase, {
          name: ing.name,
          nutrition: null,
        })
        await linkIngredient(supabase, {
          recipe_id: id,
          ingredient_id: ingredient.id,
          quantity_g: ing.quantity_g,
          unit: ing.unit ?? null,
        })
      }
    }

    return Response.json(recipe)
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
