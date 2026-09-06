import { createServiceClient } from "@/lib/supabase/service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = process.env.WHATSAPP_BOT_SECRET
  if (!secret || request.headers.get("x-bot-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const supabase = createServiceClient()
  if (!supabase) return Response.json({ error: "Push not configured" }, { status: 500 })

  const { id } = await params
  const { data, error } = await supabase
    .from("order_deliveries")
    .select("order_id, rider_id, status, short_code, pickup_code, assigned_at, delivered_at")
    .eq("order_id", id)
    .single()
  if (error || !data) return Response.json({ error: "Delivery not found" }, { status: 404 })
  return Response.json(data)
}
