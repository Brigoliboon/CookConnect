import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { listAddonsForMeal, createRecipeAddon } from "@/lib/supabase/tables/recipe_addons"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const mealId = new URL(request.url).searchParams.get("meal_id")?.trim()

  if (!mealId) {
    return Response.json({ error: "meal_id is required" }, { status: 400 })
  }

  try {
    const data = await listAddonsForMeal(supabase, mealId)
    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: {
    meal_recipe_id?: string
    addon_recipe_id?: string
    extra_cents?: number
    is_default?: boolean
    links?: { meal_recipe_id: string; addon_recipe_id: string; extra_cents?: number; is_default?: boolean }[]
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    if (body.links?.length) {
      const created = []
      for (const link of body.links) {
        if (!link.meal_recipe_id || !link.addon_recipe_id) continue
        created.push(
          await createRecipeAddon(supabase, {
            meal_recipe_id: link.meal_recipe_id,
            addon_recipe_id: link.addon_recipe_id,
            extra_cents: link.extra_cents ?? 0,
            is_default: link.is_default ?? false,
          }),
        )
      }
      return Response.json({ data: created }, { status: 201 })
    }
    if (!body.meal_recipe_id || !body.addon_recipe_id) {
      return Response.json({ error: "meal_recipe_id and addon_recipe_id are required" }, { status: 400 })
    }
    const data = await createRecipeAddon(supabase, {
      meal_recipe_id: body.meal_recipe_id,
      addon_recipe_id: body.addon_recipe_id,
      extra_cents: body.extra_cents ?? 0,
      is_default: body.is_default ?? false,
    })
    return Response.json({ data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
