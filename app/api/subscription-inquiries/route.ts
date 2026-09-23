import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { createSubscriptionInquiry, listSubscriptionInquiries } from "@/lib/supabase/tables/subscription_inquiries"

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const data = await listSubscriptionInquiries(supabase)
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: {
    plan_id?: string
    name?: string
    email?: string | null
    mobile_number?: string
    address?: string
    location?: { lat: number; lng: number } | null
    mode?: string
    restrictions?: string[]
    restrictionNames?: Record<string, string>
    mealsPerDay?: number
    includedMeals?: string[]
    days?: string[]
    slot?: string | null
    time?: string | null
    onCall?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.plan_id || !body.name?.trim() || !body.mobile_number?.trim() || !body.address?.trim()) {
    return Response.json({ error: "plan_id, name, mobile_number and address are required" }, { status: 400 })
  }

  try {
    const data = await createSubscriptionInquiry(supabase, {
      plan_id: body.plan_id,
      name: body.name.trim(),
      email: body.email?.trim() || null,
      mobile_number: body.mobile_number.trim(),
      address: body.address.trim(),
      location: body.location ?? null,
      details: {
        mode: body.mode ?? "normal",
        restrictions: body.restrictions ?? [],
        restrictionNames: body.restrictionNames ?? {},
        mealsPerDay: body.mealsPerDay ?? 1,
        includedMeals: body.includedMeals ?? [],
        days: body.days ?? [],
        slot: body.slot ?? null,
        time: body.time ?? null,
        onCall: body.onCall ?? false,
      },
    })
    return Response.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
