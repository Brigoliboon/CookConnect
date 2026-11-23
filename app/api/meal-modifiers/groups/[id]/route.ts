import { requireEmployeeOrAdmin } from "@/lib/auth"
import {
  deleteModifierGroup,
  isUuid,
  jsonFromUnknown,
  parseGroupInput,
  updateModifierGroup,
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
  if (!isUuid(id)) return Response.json({ error: "Modifier group not found" }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const input = parseGroupInput(body, true)
    const data = await updateModifierGroup(supabase, id, input)
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
  if (!isUuid(id)) return Response.json({ error: "Modifier group not found" }, { status: 404 })

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    await deleteModifierGroup(supabase, id)
    return Response.json({ ok: true })
  } catch (err) {
    return jsonFromUnknown(err)
  }
}
