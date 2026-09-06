import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let body: { lat?: number; lng?: number; order_ids?: string[] }
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

  const orderIds = (body.order_ids ?? []).filter((id) => typeof id === "string")
  if (orderIds.length > 0) {
    const { error: deliveryError } = await supabase
      .from("order_deliveries")
      .update({
        rider_location: `SRID=4326;POINT(${body.lng} ${body.lat})`,
        rider_loc_updated_at: new Date().toISOString(),
      })
      .in("order_id", orderIds)
      .eq("rider_id", user.id)
      .eq("status", "assigned")
    if (deliveryError) return Response.json({ error: deliveryError.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}
