import { requireEmployeeOrAdmin } from "@/lib/auth"
import {
  createModifierGroup,
  jsonFromUnknown,
  listModifierGroups,
  parseGroupInput,
} from "@/lib/supabase/tables/meal_modifiers"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function GET() {
  const auth = await requireEmployeeOrAdmin()
  if (!auth.ok) return auth.response

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const data = await listModifierGroups(supabase, true)
    return Response.json({ data })
  } catch (err) {
    return jsonFromUnknown(err)
  }
}

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
    const input = parseGroupInput(body, false)
    const data = await createModifierGroup(supabase, input)
    return Response.json({ data }, { status: 201 })
  } catch (err) {
    return jsonFromUnknown(err)
  }
}
