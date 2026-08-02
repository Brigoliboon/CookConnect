import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import {
  consumeQuota,
  InsufficientQuotaError,
  listQuotasWithIngredients,
  resetQuotaUsage,
  setQuotaTotal,
} from "@/lib/supabase/tables/subscription_quotas"
import { summarizeQuota } from "@/lib/subscriptions/quota"

function toSummaryPayload(quota: Awaited<ReturnType<typeof listQuotasWithIngredients>>[number]) {
  const { quotaTotalG, quotaUsedG, remainingG, ratio } = summarizeQuota(quota)
  return {
    id: quota.id,
    subscription_id: quota.subscription_id,
    ingredient_id: quota.ingredient_id,
    ingredient: quota.ingredient,
    quota_total_g: quotaTotalG,
    quota_used_g: quotaUsedG,
    remaining_g: remainingG,
    ratio,
    updated_at: quota.updated_at,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const quotas = await listQuotasWithIngredients(supabase, id)
    return Response.json(quotas.map(toSummaryPayload))
  } catch (err) {
    console.error("[API] GET /api/subscriptions/[id]/quotas error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let body: { action?: string; ingredient_id?: string; grams?: number; quota_total_g?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { action, ingredient_id, grams, quota_total_g } = body

  if (!ingredient_id) {
    return Response.json({ error: "ingredient_id is required" }, { status: 400 })
  }

  try {
    if (action === "set") {
      if (typeof quota_total_g !== "number") {
        return Response.json({ error: "quota_total_g is required for action 'set'" }, { status: 400 })
      }
      const quota = await setQuotaTotal(supabase, id, ingredient_id, quota_total_g)
      return Response.json(toSummaryPayload({ ...quota, ingredient: null }))
    }

    if (action === "consume") {
      if (typeof grams !== "number") {
        return Response.json({ error: "grams is required for action 'consume'" }, { status: 400 })
      }
      const quota = await consumeQuota(supabase, id, ingredient_id, grams)
      return Response.json(toSummaryPayload({ ...quota, ingredient: null }))
    }

    if (action === "reset") {
      await resetQuotaUsage(supabase, id, ingredient_id)
      const quotas = await listQuotasWithIngredients(supabase, id)
      return Response.json(quotas.map(toSummaryPayload))
    }

    return Response.json({ error: "Unknown action. Use 'set', 'consume', or 'reset'." }, { status: 400 })
  } catch (err) {
    if (err instanceof InsufficientQuotaError) {
      return Response.json(
        {
          error: err.message,
          ingredientId: err.ingredientId,
          requestedG: err.requestedG,
          availableG: err.availableG,
        },
        { status: 409 },
      )
    }
    console.error("[API] POST /api/subscriptions/[id]/quotas error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
