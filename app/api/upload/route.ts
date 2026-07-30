import { uploadImage } from "@/lib/supabase/storage"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "File is required" }, { status: 400 })
  }

  try {
    const url = await uploadImage(supabase, file)
    return Response.json({ url })
  } catch (err) {
    console.error("[API] POST /api/upload error:", err)
    const message = err instanceof Error ? err.message : "Upload failed"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}
