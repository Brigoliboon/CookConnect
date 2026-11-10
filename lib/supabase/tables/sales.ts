import type { OrderOrigin } from "../models"

export interface SalesRange {
  from: string | null
  to: string | null
}

export interface SalesCurrencyTotals {
  currency: string
  orders_cents: number
  delivery_fees_cents: number
  orders_count: number
  subscription_cents: number
  subscriptions_count: number
  total_cents: number
}

export interface SalesByOriginRow {
  origin: OrderOrigin
  currency: string
  orders_cents: number
  delivery_fees_cents: number
  orders_count: number
}

export interface SalesByRecipeRow {
  recipe_id: string | null
  item_name: string
  qty: number
  amount_cents: number
  currency: string
}

export interface SalesByPlanRow {
  plan_id: string
  plan_name: string
  currency: string
  amount_cents: number
  payments_count: number
}

export interface SalesByDayRow {
  day: string
  currency: string
  orders_cents: number
  delivery_fees_cents: number
  subscription_cents: number
}

export interface SalesSummary {
  range: SalesRange
  totals_by_currency: SalesCurrencyTotals[]
  by_origin: SalesByOriginRow[]
  by_recipe: SalesByRecipeRow[]
  by_plan: SalesByPlanRow[]
  by_day: SalesByDayRow[]
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const UAE_TZ = "Asia/Dubai"

export function validateSalesRange(from?: string | null, to?: string | null): string | null {
  if (from && (!DAY_RE.test(from) || Number.isNaN(Date.parse(from)))) {
    return "from must be a YYYY-MM-DD date"
  }
  if (to && (!DAY_RE.test(to) || Number.isNaN(Date.parse(to)))) {
    return "to must be a YYYY-MM-DD date"
  }
  if (from && to && from > to) return "from must not be after to"
  return null
}

function startOfUaeDay(day: string): string {
  return `${day}T00:00:00+04:00`
}

function endOfUaeDay(day: string): string {
  return `${day}T23:59:59.999+04:00`
}

function uaeDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: UAE_TZ })
}

function num(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getSalesSummary(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  range: SalesRange = { from: null, to: null },
): Promise<SalesSummary> {
  const fromIso = range.from ? startOfUaeDay(range.from) : null
  const toIso = range.to ? endOfUaeDay(range.to) : null

  let ordersQuery = supabase
    .from("orders")
    .select("id, currency, origin, delivered_at, subtotal_cents, shipping_cents")
    .eq("status", "delivered")
    .not("delivered_at", "is", null)
  if (fromIso) ordersQuery = ordersQuery.gte("delivered_at", fromIso)
  if (toIso) ordersQuery = ordersQuery.lte("delivered_at", toIso)
  const { data: orderRows, error: ordersError } = await ordersQuery
  if (ordersError) throw ordersError

  let itemsQuery = supabase
    .from("order_items")
    .select("recipe_id, name, qty, unit_price_cents, orders!inner(status, delivered_at, currency)")
    .eq("orders.status", "delivered")
    .not("orders.delivered_at", "is", null)
  if (fromIso) itemsQuery = itemsQuery.gte("orders.delivered_at", fromIso)
  if (toIso) itemsQuery = itemsQuery.lte("orders.delivered_at", toIso)
  const { data: itemRows, error: itemsError } = await itemsQuery
  if (itemsError) throw itemsError

  let paymentsQuery = supabase
    .from("subscription_payments")
    .select("amount_cents, paid_at, subscription_id")
  if (fromIso) paymentsQuery = paymentsQuery.gte("paid_at", fromIso)
  if (toIso) paymentsQuery = paymentsQuery.lte("paid_at", toIso)
  const { data: paymentRows, error: paymentsError } = await paymentsQuery
  if (paymentsError) throw paymentsError

  const { data: subscriptionRows, error: subscriptionsError } = await supabase
    .from("subscriptions")
    .select("id, subscription_plan_id")
  if (subscriptionsError) throw subscriptionsError

  const { data: planRows, error: plansError } = await supabase
    .from("subscription_plans")
    .select("id, name, currency")
  if (plansError) throw plansError

  const planOfSubscription = new Map<string, string>()
  for (const row of (subscriptionRows ?? []) as { id: string; subscription_plan_id: string }[]) {
    planOfSubscription.set(row.id, row.subscription_plan_id)
  }
  const planById = new Map<string, { id: string; name: string; currency: string }>()
  for (const row of (planRows ?? []) as { id: string; name: string; currency: string }[]) {
    planById.set(row.id, row)
  }

  const totals = new Map<string, SalesCurrencyTotals>()
  const totalsFor = (currency: string): SalesCurrencyTotals => {
    let row = totals.get(currency)
    if (!row) {
      row = {
        currency,
        orders_cents: 0,
        delivery_fees_cents: 0,
        orders_count: 0,
        subscription_cents: 0,
        subscriptions_count: 0,
        total_cents: 0,
      }
      totals.set(currency, row)
    }
    return row
  }

  const originRows = new Map<string, SalesByOriginRow>()
  const originFor = (origin: OrderOrigin, currency: string): SalesByOriginRow => {
    const key = `${origin}|${currency}`
    let row = originRows.get(key)
    if (!row) {
      row = { origin, currency, orders_cents: 0, delivery_fees_cents: 0, orders_count: 0 }
      originRows.set(key, row)
    }
    return row
  }

  const dayRows = new Map<string, SalesByDayRow>()
  const dayFor = (day: string, currency: string): SalesByDayRow => {
    const key = `${day}|${currency}`
    let row = dayRows.get(key)
    if (!row) {
      row = { day, currency, orders_cents: 0, delivery_fees_cents: 0, subscription_cents: 0 }
      dayRows.set(key, row)
    }
    return row
  }

  const recipeRows = new Map<string, SalesByRecipeRow>()
  const planRowsOut = new Map<string, SalesByPlanRow>()

  for (const raw of (orderRows ?? []) as Record<string, unknown>[]) {
    const currency = String(raw.currency ?? "AED")
    const deliveredAt = String(raw.delivered_at ?? "")
    const itemsCents = num(raw.subtotal_cents)
    const feeCents = num(raw.shipping_cents)
    const totalsRow = totalsFor(currency)
    totalsRow.orders_cents += itemsCents
    totalsRow.delivery_fees_cents += feeCents
    totalsRow.orders_count += 1
    const originRow = originFor(raw.origin as OrderOrigin, currency)
    originRow.orders_cents += itemsCents
    originRow.delivery_fees_cents += feeCents
    originRow.orders_count += 1
    const dayRow = dayFor(uaeDay(deliveredAt), currency)
    dayRow.orders_cents += itemsCents
    dayRow.delivery_fees_cents += feeCents
  }

  for (const raw of (itemRows ?? []) as Record<string, unknown>[]) {
    const order = (raw.orders ?? {}) as { currency?: string }
    const currency = String(order.currency ?? "AED")
    const recipeId = (raw.recipe_id as string | null) ?? null
    const itemName = String(raw.name ?? "")
    const key = `${recipeId ?? ""}|${itemName}|${currency}`
    let row = recipeRows.get(key)
    if (!row) {
      row = { recipe_id: recipeId, item_name: itemName, qty: 0, amount_cents: 0, currency }
      recipeRows.set(key, row)
    }
    const qty = num(raw.qty)
    row.qty += qty
    row.amount_cents += num(raw.unit_price_cents) * qty
  }

  for (const raw of (paymentRows ?? []) as Record<string, unknown>[]) {
    const amount = num(raw.amount_cents)
    const paidAt = String(raw.paid_at ?? "")
    const subscriptionId = String(raw.subscription_id ?? "")
    const planId = planOfSubscription.get(subscriptionId) ?? ""
    const plan = planById.get(planId)
    const planCurrency = String(plan?.currency ?? "AED")
    const totalsRow = totalsFor(planCurrency)
    totalsRow.subscription_cents += amount
    totalsRow.subscriptions_count += 1
    const dayRow = dayFor(uaeDay(paidAt), planCurrency)
    dayRow.subscription_cents += amount
    const planKey = `${planId}|${planCurrency}`
    let planRow = planRowsOut.get(planKey)
    if (!planRow) {
      planRow = {
        plan_id: planId,
        plan_name: String(plan?.name ?? ""),
        currency: planCurrency,
        amount_cents: 0,
        payments_count: 0,
      }
      planRowsOut.set(planKey, planRow)
    }
    planRow.amount_cents += amount
    planRow.payments_count += 1
  }

  const totalsByCurrency = [...totals.values()]
    .map((row) => ({ ...row, total_cents: row.orders_cents + row.delivery_fees_cents + row.subscription_cents }))
    .sort((a, b) => a.currency.localeCompare(b.currency))

  const byOrigin = [...originRows.values()].sort(
    (a, b) => b.orders_cents + b.delivery_fees_cents - (a.orders_cents + a.delivery_fees_cents),
  )

  const byRecipe = [...recipeRows.values()].sort((a, b) => b.amount_cents - a.amount_cents)

  const byPlan = [...planRowsOut.values()].sort((a, b) => b.amount_cents - a.amount_cents)

  const byDay = [...dayRows.values()].sort((a, b) => a.day.localeCompare(b.day))

  return {
    range: { from: range.from ?? null, to: range.to ?? null },
    totals_by_currency: totalsByCurrency,
    by_origin: byOrigin,
    by_recipe: byRecipe,
    by_plan: byPlan,
    by_day: byDay,
  }
}
