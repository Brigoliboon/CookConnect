import { getCurrentUser, isEmployeeOrAdminRole } from "@/lib/auth"
import { isUuid, jsonFromUnknown, listModifierGroupsForMeal } from "@/lib/supabase/tables/meal_modifiers"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const mealId = new URL(request.url).searchParams.get("meal_id")?.trim()
  if (!mealId) {
    return Response.json({ error: "meal_id is required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    if (!isUuid(mealId)) {
      return Response.json({ data: [] })
    }

    const { data: meal, error: mealError } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", mealId)
      .maybeSingle()
    if (mealError) throw mealError
    if (!meal) return Response.json({ data: [] })

    const user = await getCurrentUser()
    const includeInactive = !!user && isEmployeeOrAdminRole(user.role)
    const data = await listModifierGroupsForMeal(supabase, mealId, includeInactive)
    return Response.json({ data })
  } catch (err) {
    return jsonFromUnknown(err)
  }
}
