import { requireEmployeeOrAdmin } from "@/lib/auth"
import {
  deleteModifierOption,
  isUuid,
  jsonFromUnknown,
  parseOptionInput,
  updateModifierOption,
} from "@/lib/supabase/tables/meal_modifiers"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireEmployeeOrAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!isUuid(id)) return Response.json({ error: "Modifier option not found" }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const input = parseOptionInput(body, true)
    const data = await updateModifierOption(supabase, id, input)
    return Response.json({ data })
  } catch (err) {
    return jsonFromUnknown(err)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireEmployeeOrAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!isUuid(id)) return Response.json({ error: "Modifier option not found" }, { status: 404 })

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    await deleteModifierOption(supabase, id)
    return Response.json({ ok: true })
  } catch (err) {
    return jsonFromUnknown(err)
  }
}
