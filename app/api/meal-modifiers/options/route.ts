import { requireEmployeeOrAdmin } from "@/lib/auth"
import {
  createModifierOption,
  jsonFromUnknown,
  parseOptionInput,
} from "@/lib/supabase/tables/meal_modifiers"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const auth = await requireEmployeeOrAdmin()
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const input = parseOptionInput(body, false)
    const data = await createModifierOption(supabase, input)
    return Response.json({ data }, { status: 201 })
  } catch (err) {
    return jsonFromUnknown(err)
  }
}
