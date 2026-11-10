"use client"

import useSWR from "swr"
import type { SalesCurrencyTotals, SalesSummary } from "@/lib/supabase/tables/sales"
import type { SubscriptionWithDetails } from "@/lib/supabase/tables/subscriptions"

export type PerformanceRange = "today" | "7d" | "30d"

const UAE_TZ = "Asia/Dubai"
const DAY_MS = 86_400_000

function uaeToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: UAE_TZ })
}

function addDays(day: string, delta: number) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

function rangeDates(range: PerformanceRange) {
  const to = uaeToday()
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30
  return { from: addDays(to, -(days - 1)), to }
}

function previousRangeDates(range: PerformanceRange) {
  const current = rangeDates(range)
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30
  return { from: addDays(current.from, -days), to: addDays(current.to, -days) }
}

function pickCurrency(summary: SalesSummary | undefined): SalesCurrencyTotals | null {
  if (!summary) return null
  return summary.totals_by_currency.find((row) => row.currency === "AED")
    ?? summary.totals_by_currency[0]
    ?? null
}

function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null
  return ((current - previous) / previous) * 100
}

function subscriptionCounts(subscriptions: SubscriptionWithDetails[] | undefined) {
  const now = Date.now()
  const renewingCutoff = now + 7 * DAY_MS
  const active = (subscriptions ?? []).filter((subscription) => (
    subscription.status === "active"
    && !subscription.paused_at
    && new Date(subscription.expires_at).getTime() > now
  ))
  return {
    active: active.length,
    renewingSoon: active.filter((subscription) => (
      new Date(subscription.expires_at).getTime() <= renewingCutoff
    )).length,
  }
}

async function fetchSales(url: string): Promise<SalesSummary> {
  const res = await fetch(url, { cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? "Failed to load sales")
  return json as SalesSummary
}

async function fetchSubscriptions(url: string): Promise<SubscriptionWithDetails[]> {
  const res = await fetch(url, { cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? "Failed to load subscriptions")
  return json as SubscriptionWithDetails[]
}

export function useDashboardPerformance(range: PerformanceRange, enabled = true) {
  const currentRange = rangeDates(range)
  const previousRange = previousRangeDates(range)

  const current = useSWR<SalesSummary>(
    enabled ? `/api/sales?from=${currentRange.from}&to=${currentRange.to}` : null,
    fetchSales,
    { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 10_000 },
  )
  const previous = useSWR<SalesSummary>(
    enabled ? `/api/sales?from=${previousRange.from}&to=${previousRange.to}` : null,
    fetchSales,
    { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 10_000 },
  )
  const subscriptions = useSWR<SubscriptionWithDetails[]>(
    enabled ? "/api/subscriptions" : null,
    fetchSubscriptions,
    { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 10_000 },
  )

  const currentTotals = pickCurrency(current.data)
  const previousTotals = pickCurrency(previous.data)
  const orders = currentTotals?.orders_count ?? 0
  const previousOrders = previousTotals?.orders_count ?? 0
  const aovCents = orders > 0 ? Math.round((currentTotals?.orders_cents ?? 0) / orders) : 0
  const previousAovCents = previousOrders > 0
    ? Math.round((previousTotals?.orders_cents ?? 0) / previousOrders)
    : 0
  const subscriptionStatus = subscriptionCounts(subscriptions.data)

  return {
    revenueCents: currentTotals?.total_cents ?? 0,
    orders,
    aovCents,
    activeSubscriptions: subscriptionStatus.active,
    renewingSoon: subscriptionStatus.renewingSoon,
    currency: currentTotals?.currency ?? "AED",
    revenueDelta: percentDelta(currentTotals?.total_cents ?? 0, previousTotals?.total_cents ?? 0),
    ordersDelta: percentDelta(orders, previousOrders),
    aovDelta: percentDelta(aovCents, previousAovCents),
    summary: current.data,
    subscriptions: subscriptions.data ?? [],
    range: currentRange,
    loading: current.isLoading || previous.isLoading || subscriptions.isLoading,
    salesLoading: current.isLoading,
    salesError: current.error,
    subscriptionsLoading: subscriptions.isLoading,
    error: current.error ?? previous.error ?? subscriptions.error,
  }
}
