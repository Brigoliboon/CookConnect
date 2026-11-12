import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import {
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  updateSubscriptionDetails,
} from "@/lib/supabase/tables/subscriptions"

function sanitizeUaLocal(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("971")) digits = digits.slice(3)
  else if (digits.startsWith("0971")) digits = digits.slice(4)
  else if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(0, 9)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: {
    action?: string
    details?: {
      name?: unknown
      email?: unknown
      mobile_number?: unknown
      address?: unknown
    }
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.details && typeof body.details === "object") {
    const name = typeof body.details.name === "string" ? body.details.name.trim() : ""
    const address = typeof body.details.address === "string" ? body.details.address.trim() : ""
    const emailRaw = typeof body.details.email === "string" ? body.details.email.trim() : ""
    const mobileRaw = typeof body.details.mobile_number === "string" ? body.details.mobile_number : ""
    const local = sanitizeUaLocal(mobileRaw)

    if (!name) return Response.json({ error: "name is required" }, { status: 400 })
    if (!address) return Response.json({ error: "address is required" }, { status: 400 })
    if (local.length !== 9) {
      return Response.json({ error: "mobile_number must be a UAE number (9 digits after +971)" }, { status: 400 })
    }
    if (emailRaw && !emailRaw.includes("@")) {
      return Response.json({ error: "email is invalid" }, { status: 400 })
    }

    try {
      const data = await updateSubscriptionDetails(supabase, id, {
        name,
        email: emailRaw || null,
        mobile_number: `+971${local}`,
        address,
      })
      return Response.json(data)
    } catch (err) {
      console.error("[API] PATCH /api/subscriptions/[id] details error:", err)
      const message = err instanceof Error ? err.message : "Internal server error"
      return Response.json({ error: message }, { status: 500 })
    }
  }

  if (body.action !== "cancel" && body.action !== "pause" && body.action !== "resume") {
    return Response.json({ error: "Only actions 'cancel', 'pause' and 'resume' or a details update are supported" }, { status: 400 })
  }

  try {
    const data =
      body.action === "cancel"
        ? await cancelSubscription(supabase, id)
        : body.action === "pause"
          ? await pauseSubscription(supabase, id)
          : await resumeSubscription(supabase, id)
    return Response.json(data)
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === "23P01" || code === "23505") {
      return Response.json(
        { error: "Resuming would overlap another subscription period for this customer." },
        { status: 409 },
      )
    }
    console.error("[API] PATCH /api/subscriptions/[id] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
