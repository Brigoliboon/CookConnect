import { getCurrentUser } from "@/lib/auth"
import { SUBSCRIPTION_PLANS } from "@/constants/subscriptions"
import { createSubscriptionInviteToken } from "@/lib/subscription/invite-token"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin" && user.role !== "employee") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { plan?: string; expiresInDays?: number; locale?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === body.plan)
  if (!plan) {
    return Response.json({ error: "Unknown subscription plan" }, { status: 400 })
  }

  const expiresInDays = Number(body.expiresInDays ?? 14)
  if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
    return Response.json({ error: "expiresInDays must be between 1 and 365" }, { status: 400 })
  }

  try {
    const { token, expiresAt } = createSubscriptionInviteToken(plan.id, expiresInDays)
    const locale = body.locale === "ar" ? "ar" : "en"
    const origin = new URL(request.url).origin
    const path = `${locale === "ar" ? "/ar" : ""}/subscription-onboarding?plan=${encodeURIComponent(plan.id)}&token=${encodeURIComponent(token)}`

    return Response.json(
      {
        token,
        expiresAt,
        plan: plan.id,
        path,
        url: `${origin}${path}`,
      },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
