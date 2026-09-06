import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let body: { lat?: number; lng?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (
    typeof body.lat !== "number" ||
    typeof body.lng !== "number" ||
    !Number.isFinite(body.lat) ||
    !Number.isFinite(body.lng) ||
    Math.abs(body.lat) > 90 ||
    Math.abs(body.lng) > 180
  ) {
    return Response.json({ error: "lat and lng must be valid coordinates" }, { status: 400 })
  }

  const { error } = await supabase.rpc("set_rider_location", { lat: body.lat, lng: body.lng })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
