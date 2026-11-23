import { requireEmployeeOrAdmin } from "@/lib/auth"
import { jsonFromUnknown, replaceMealModifierLinks } from "@/lib/supabase/tables/meal_modifiers"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function PUT(request: Request) {
  const auth = await requireEmployeeOrAdmin()
  if (!auth.ok) return auth.response

  let body: { meal_recipe_id?: string; group_ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const mealRecipeId = typeof body.meal_recipe_id === "string" ? body.meal_recipe_id.trim() : ""
  if (!mealRecipeId) {
    return Response.json({ error: "meal_recipe_id is required" }, { status: 400 })
  }
  if (!Array.isArray(body.group_ids)) {
    return Response.json({ error: "group_ids must be an array" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const data = await replaceMealModifierLinks(
      supabase,
      mealRecipeId,
      body.group_ids.map((id) => (typeof id === "string" ? id : String(id))),
    )
    return Response.json({ data })
  } catch (err) {
    return jsonFromUnknown(err)
  }
}
