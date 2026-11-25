import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import {
  parseSubscriptionCsvRow,
  subscriptionDetailsFromCsvRow,
} from "@/lib/subscription/csv"
import { listActivePlanRows, PLAN_DAYS, resolveActivePlan } from "@/lib/subscription/plan"
import { createSubscription, setSubscriptionRemainingMealCount } from "@/lib/supabase/tables/subscriptions"
import { recordSubscriptionPayment } from "@/lib/supabase/tables/subscription_payments"
import { createClient } from "@/utils/supabase/server"
import { indexIngredientsByName } from "@/lib/subscription/restrictions"
import { subscriptionAddonTotalCents } from "@/constants/subscription-addons"

const MAX_ROWS = 500

function normalizeImportRow(entry: unknown, index: number): { line: number; values: Record<string, string> } {
  if (!entry || typeof entry !== "object") return { line: index + 2, values: {} }
  const rec = entry as Record<string, unknown>
  if (rec.values && typeof rec.values === "object" && !Array.isArray(rec.values)) {
    return {
      line: typeof rec.line === "number" ? rec.line : index + 2,
      values: rec.values as Record<string, string>,
    }
  }
  const { line, ...rest } = rec
  return {
    line: typeof line === "number" ? line : index + 2,
    values: rest as Record<string, string>,
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "admin" && user.role !== "employee") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { rows?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const rawRows = Array.isArray(body.rows) ? body.rows : null
  if (!rawRows) {
    return Response.json({ error: "rows is required" }, { status: 400 })
  }
  if (rawRows.length === 0) {
    return Response.json({ error: "CSV has no data rows" }, { status: 400 })
  }
  if (rawRows.length > MAX_ROWS) {
    return Response.json({ error: `CSV cannot exceed ${MAX_ROWS} rows` }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const [plans, recipesRes, ingredientsRes, subRecipesRes] = await Promise.all([
      listActivePlanRows(supabase),
      supabase.from("recipes").select("id, name").eq("is_active", true),
      supabase.from("ingredients").select("id, name"),
      supabase
        .from("recipes")
        .select("id")
        .eq("is_active", true)
        .eq("is_subscription_included", true),
    ])
    if (recipesRes.error) throw recipesRes.error
    if (ingredientsRes.error) throw ingredientsRes.error
    if (subRecipesRes.error) throw subRecipesRes.error

    const recipesByName = new Map<string, string>()
    for (const recipe of recipesRes.data ?? []) {
      const key = String(recipe.name ?? "").trim().toLowerCase()
      if (key && !recipesByName.has(key)) recipesByName.set(key, recipe.id)
    }
    const ingredientsByName = indexIngredientsByName(
      (ingredientsRes.data ?? []).map((ingredient) => ({
        id: ingredient.id,
        name: String(ingredient.name ?? ""),
      })),
    )
    const subscriptionRecipeIds = (subRecipesRes.data ?? []).map((recipe) => recipe.id)

    let created = 0
    let failed = 0
    const errors: { line: number; message: string }[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const { line, values } = normalizeImportRow(rawRows[i], i)

      try {
        const parsed = parseSubscriptionCsvRow(values, {
          recipesByName,
          ingredientsByName,
          subscriptionRecipeIds,
        })
        const planRow = resolveActivePlan(plans, parsed.planId)
        if (!planRow) {
          const validityDays = PLAN_DAYS[parsed.planId] ?? parsed.durationDays
          throw new Error(`No active subscription plan matching "${parsed.planId}" (${validityDays} days)`)
        }

        const details = subscriptionDetailsFromCsvRow(parsed)
        const addonCents = subscriptionAddonTotalCents(details)
        const baseTotalCents =
          typeof details.total_cents === "number" ? details.total_cents : null
        const totalCents = baseTotalCents === null ? null : baseTotalCents + addonCents
        if (totalCents !== null) details.total_cents = totalCents
        if (addonCents > 0) details.addon_total_cents = addonCents
        if (parsed.paid_cents > 0 && (totalCents === null || parsed.paid_cents > totalCents)) {
          throw new Error("paid_aed cannot exceed total_aed plus add-ons")
        }

        const subscription = await createSubscription(supabase, {
          customer_id: null,
          subscription_plan_id: planRow.id,
          started_at: parsed.started_at,
          expires_at: parsed.expires_at,
          paused_at: parsed.paused ? new Date().toISOString() : null,
          details,
        })

        if (parsed.remaining_meals !== undefined) {
          await setSubscriptionRemainingMealCount(supabase, subscription.id, parsed.remaining_meals)
        }

        if (parsed.paid_cents > 0) {
          await recordSubscriptionPayment(supabase, {
            subscription_id: subscription.id,
            amount_cents: parsed.paid_cents,
            method: parsed.payment_method,
            reference: parsed.payment_reference,
          })
        }
        created++
      } catch (err) {
        failed++
        const code = (err as { code?: string }).code
        const message =
          code === "23P01" || code === "23505"
            ? "Overlapping subscription period for this customer."
            : err instanceof Error ? err.message : "Failed to import row"
        errors.push({ line, message })
      }
    }

    return Response.json({ created, failed, errors })
  } catch (err) {
    console.error("[API] POST /api/subscriptions/import error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
