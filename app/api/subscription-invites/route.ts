import { getCurrentUser } from "@/lib/auth"
import { SUBSCRIPTION_PLANS } from "@/constants/subscriptions"
import { createSubscriptionInviteToken } from "@/lib/subscription/invite-token"

function checkBotRequest(request: Request): "authorized" | "missing-secret" | "invalid" | "none" {
  const provided = request.headers.get("x-bot-secret")
  if (!provided) return "none"
  const secret = process.env.WHATSAPP_BOT_SECRET
  if (!secret) return "missing-secret"
  return provided === secret ? "authorized" : "invalid"
}

export async function POST(request: Request) {
  const botCheck = checkBotRequest(request)
  if (botCheck === "missing-secret") {
    return Response.json({ error: "Bot authentication is not configured" }, { status: 500 })
  }
  if (botCheck === "invalid") {
    return Response.json({ error: "Invalid bot secret" }, { status: 401 })
  }
  const botAuthorized = botCheck === "authorized"
  if (!botAuthorized) {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "admin" && user.role !== "employee") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  let body: {
    plan?: string
    expiresInDays?: number
    locale?: string
    price_cents?: number
    base_price_cents?: number
    concession_id?: string
    meals_per_day?: number
  }
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

  const priceCents = body.price_cents === undefined ? undefined : Number(body.price_cents)
  if (priceCents !== undefined && (!Number.isFinite(priceCents) || !Number.isInteger(priceCents) || priceCents <= 0)) {
    return Response.json({ error: "price_cents must be a positive integer" }, { status: 400 })
  }
  if (botAuthorized && priceCents === undefined) {
    return Response.json({ error: "price_cents is required for bot invitations" }, { status: 400 })
  }
  const basePriceCents = body.base_price_cents === undefined ? undefined : Number(body.base_price_cents)
  if (basePriceCents !== undefined && (!Number.isFinite(basePriceCents) || !Number.isInteger(basePriceCents) || basePriceCents <= 0)) {
    return Response.json({ error: "base_price_cents must be a positive integer" }, { status: 400 })
  }
  const concession = typeof body.concession_id === "string" ? body.concession_id.trim() : ""
  if (concession.length > 64) {
    return Response.json({ error: "concession_id is too long" }, { status: 400 })
  }
  const mealsPerDay = body.meals_per_day === undefined ? undefined : Number(body.meals_per_day)
  if (
    mealsPerDay !== undefined &&
    (!Number.isFinite(mealsPerDay) || !Number.isInteger(mealsPerDay) || mealsPerDay < 1 || mealsPerDay > 5)
  ) {
    return Response.json({ error: "meals_per_day must be an integer between 1 and 5" }, { status: 400 })
  }

  try {
    const { token, expiresAt } = createSubscriptionInviteToken(plan.id, expiresInDays, {
      agreedPriceCents: priceCents,
      basePriceCents,
      concession,
      currency: "AED",
      mealsPerDay,
    })
    const locale = body.locale === "ar" ? "ar" : "en"
    const origin = new URL(request.url).origin
    const path = `${locale === "ar" ? "/ar" : ""}/subscription-onboarding?plan=${encodeURIComponent(plan.id)}&token=${encodeURIComponent(token)}`

    return Response.json(
      {
        token,
        expiresAt,
        plan: plan.id,
        ...(priceCents !== undefined ? { price_cents: priceCents } : {}),
        ...(basePriceCents !== undefined ? { base_price_cents: basePriceCents } : {}),
        ...(concession ? { concession_id: concession } : {}),
        ...(mealsPerDay !== undefined ? { meals_per_day: mealsPerDay } : {}),
        currency: "AED",
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
