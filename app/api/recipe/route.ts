import { createRecipe, listRecipes, type CreateRecipeInput } from "@/lib/supabase/tables/recipes"
import { upsertIngredient, linkIngredient } from "@/lib/supabase/tables/ingredients"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

interface IngredientInput {
  name: string
  quantity_g: number
  unit: string | null
  nutrition?: Record<string, unknown> | null
}

interface CreateMealBody extends CreateRecipeInput {
  ingredients?: IngredientInput[]
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const recipes = await listRecipes(supabase)
    return Response.json(recipes)
  } catch (err) {
    console.error("[API] GET /api/recipe error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: CreateMealBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const recipe = await createRecipe(supabase, body)

    if (body.ingredients?.length) {
      for (const ing of body.ingredients) {
        const ingredient = await upsertIngredient(supabase, {
          name: ing.name,
          nutrition: ing.nutrition ?? null,
        })
        await linkIngredient(supabase, {
          recipe_id: recipe.id,
          ingredient_id: ingredient.id,
          quantity_g: ing.quantity_g,
          unit: ing.unit ?? null,
        })
      }
    }

    return Response.json(recipe, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
