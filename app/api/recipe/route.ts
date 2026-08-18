import { createRecipe, listRecipes, type CreateRecipeInput } from "@/lib/supabase/tables/recipes"
import { createServing, linkServingIngredients, type ServingIngredientInput } from "@/lib/supabase/tables/servings"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

interface ServingInput {
  name?: string | null
  price?: number | null
  calories?: number | null
  nutrition?: Record<string, unknown> | null
  is_active?: boolean
  ingredients?: ServingIngredientInput[]
}

interface CreateMealBody extends CreateRecipeInput {
  servings?: ServingInput[]
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

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

    const createdServings = []
    if (body.servings?.length) {
      for (const serving of body.servings) {
        const servingIngredients = serving.ingredients ?? []
        const linkedIngredients = await linkServingIngredients(supabase, servingIngredients)

        const created = await createServing(
          supabase,
          recipe.id,
          {
            name: serving.name ?? null,
            price: serving.price ?? null,
            calories: serving.calories ?? null,
            nutrition: serving.nutrition ?? null,
            is_active: serving.is_active ?? true,
          },
          linkedIngredients,
        )
        createdServings.push(created)
      }
    }

    return Response.json({ ...recipe, servings: createdServings }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}