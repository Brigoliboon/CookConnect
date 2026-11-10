"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowUpRight,
  CalendarClock,
  ChefHat,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingBag,
  Truck,
  TrendingDown,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import { MapboxMap, QuickActionCard } from "@/components/ui"
import { useNavCounts } from "@/hooks/useNavCounts"
import { useDashboardPerformance } from "@/hooks/useDashboardPerformance"
import { useDashboardPipeline } from "@/hooks/useDashboardPipeline"
import { useDashboardMap, type DashboardMapOrder } from "@/hooks/useDashboardMap"
import { parseOrderLocation } from "@/lib/orders/location"
import type { SubscriptionWithDetails } from "@/lib/supabase/tables/subscriptions"
import type { SalesSummary } from "@/lib/supabase/tables/sales"

type RangeKey = "today" | "7d" | "30d"

interface OriginRow {
  origin: string
  amount: number
  orders: number
  color: string
}

interface TrendRow {
  label: string
  orders: number
  subscriptions: number
}

interface PipelineRow {
  label: string
  count: number
  color: string
}

interface MealRow {
  name: string
  qty: number
  revenue: number
}

interface PlanRow {
  name: string
  revenue: number
  payments: number
}

type SubscriberStatus = "Active" | "Expiring soon" | "Paused" | "Expired" | "Cancelled"

interface SubscriberRow {
  name: string
  plan: string
  status: SubscriberStatus
  detail: string
}

interface MapMarkerRow {
  id: string
  lat: number
  lng: number
  label: string
  type: string
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
]

const PIPELINE_COLORS = {
  inquiry: "#E9A23B",
  confirmed: "#5A9CB5",
  preparing: "#7B5EA7",
  ready: "#14B8A6",
  out: "#F97316",
}

const SUBSCRIBER_STATUS_STYLES: Record<SubscriberStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  "Expiring soon": "bg-orange-50 text-orange-700",
  Paused: "bg-amber-50 text-amber-700",
  Expired: "bg-red-50 text-red-600",
  Cancelled: "bg-neutral-100 text-neutral-500",
}

const QUICK_ACTIONS = [
  { label: "New Subscription", href: "/employee/subscriptions", icon: Package, from: "#059669", to: "#047857" },
  { label: "Deliveries", href: "/employee/deliveries", icon: Truck, from: "#2563eb", to: "#1d4ed8" },
  { label: "Create Account", href: "/employee/accounts", icon: UserPlus, from: "#7c3aed", to: "#6d28d9" },
  { label: "Chef", href: "/employee/chef", icon: ChefHat, from: "#d97706", to: "#b45309" },
]

const MAP_LEGEND = [
  { type: "orders", label: "Confirmed / out" },
  { type: "today", label: "Preparing / ready" },
]

const DAY_MS = 86_400_000

const ORIGIN_META: Record<string, { label: string; color: string }> = {
  web: { label: "Web", color: "#118B50" },
  pos: { label: "POS", color: "#5A9CB5" },
  whatsapp: { label: "WhatsApp", color: "#E9A23B" },
}

const MAP_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
}

function addDays(day: string, delta: number) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

function eachDay(from: string, to: string) {
  const days: string[] = []
  let current = from
  while (current <= to) {
    days.push(current)
    current = addDays(current, 1)
  }
  return days
}

function trendLabel(day: string, range: RangeKey) {
  if (range === "today") return "Today"
  const date = new Date(`${day}T00:00:00Z`)
  if (range === "7d") {
    return date.toLocaleDateString("en-AE", { weekday: "short", timeZone: "UTC" })
  }
  return date.toLocaleDateString("en-AE", { month: "short", day: "numeric", timeZone: "UTC" })
}

function buildTrend(
  summary: SalesSummary | undefined,
  currency: string,
  range: RangeKey,
  from: string,
  to: string,
): TrendRow[] {
  const byDay = new Map(
    (summary?.by_day ?? [])
      .filter((row) => row.currency === currency)
      .map((row) => [row.day, row]),
  )
  return eachDay(from, to).map((day) => {
    const row = byDay.get(day)
    return {
      label: trendLabel(day, range),
      orders: Math.round(((row?.orders_cents ?? 0) + (row?.delivery_fees_cents ?? 0)) / 100),
      subscriptions: Math.round((row?.subscription_cents ?? 0) / 100),
    }
  })
}

function buildOrigin(summary: SalesSummary | undefined, currency: string): OriginRow[] {
  return (summary?.by_origin ?? [])
    .filter((row) => row.currency === currency)
    .map((row) => {
      const meta = ORIGIN_META[row.origin] ?? { label: row.origin, color: "#9CA3AF" }
      return {
        origin: meta.label,
        amount: row.orders_cents + row.delivery_fees_cents,
        orders: row.orders_count,
        color: meta.color,
      }
    })
}

function buildMeals(summary: SalesSummary | undefined, currency: string): MealRow[] {
  return (summary?.by_recipe ?? [])
    .filter((row) => row.currency === currency)
    .slice(0, 5)
    .map((row) => ({
      name: row.item_name,
      qty: row.qty,
      revenue: row.amount_cents,
    }))
}

function buildPlans(summary: SalesSummary | undefined, currency: string): PlanRow[] {
  return (summary?.by_plan ?? [])
    .filter((row) => row.currency === currency)
    .slice(0, 5)
    .map((row) => ({
      name: row.plan_name || "Unnamed plan",
      revenue: row.amount_cents,
      payments: row.payments_count,
    }))
}

function subscriberStatus(subscription: SubscriptionWithDetails): SubscriberStatus {
  if (subscription.status === "cancelled") return "Cancelled"
  if (subscription.paused_at) return "Paused"
  const days = Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / DAY_MS)
  if (days <= 0) return "Expired"
  return days <= 7 ? "Expiring soon" : "Active"
}

function subscriberDetail(subscription: SubscriptionWithDetails) {
  if (subscription.status === "cancelled") return "Cancelled"
  if (subscription.paused_at) return "Paused"
  const days = Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / DAY_MS)
  if (days <= 0) return "Expired"
  if (days === 1) return "1 day left"
  return `${days} days left`
}

function mapOrderLabel(order: DashboardMapOrder) {
  return `${order.name} — ${MAP_STATUS_LABELS[order.status] ?? order.status.replaceAll("_", " ")}`
}

function formatMoney(cents: number, currency: string, decimals = 0) {
  return `${currency} ${(cents / 100).toLocaleString("en-AE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function formatDelta(delta: number | null) {
  if (delta === null) return undefined
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
}

function CollapsibleSection({
  title,
  hint,
  defaultOpen = true,
  children,
}: {
  title: string
  hint?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 text-left"
      >
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 transition-colors group-hover:text-neutral-700">
          {title}
        </h2>
        <div className="h-px flex-1 bg-neutral-200/80" />
        {hint && <span className="text-[11px] text-neutral-400">{hint}</span>}
        <ChevronDown
          size={15}
          className={`shrink-0 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
        aria-hidden={!open}
      >
        <div className="pt-3">{children}</div>
      </motion.div>
    </section>
  )
}

function Panel({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  delta?: string
  hint: string
  tone: string
}) {
  const positive = !delta || !delta.startsWith("-")
  const TrendIcon = positive ? TrendingUp : TrendingDown

  return (
    <motion.div
      variants={itemVariants}
      className="relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-sm"
    >
      <div className="absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br from-neutral-100 to-transparent opacity-70" />
      <div className="relative flex items-start justify-between">
        <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${tone}`}>
          <Icon size={19} />
        </div>
        {delta && (
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-extrabold ${
            positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            <TrendIcon size={13} />
            {delta}
          </span>
        )}
      </div>
      <p className="relative mt-4 text-3xl font-bold tracking-tight text-neutral-900">{value}</p>
      <p className="relative mt-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="relative mt-2 text-[11px] text-neutral-400">{hint}</p>
    </motion.div>
  )
}

function AttentionCard({
  href,
  icon: Icon,
  label,
  value,
  hint,
}: {
  href: string
  icon: LucideIcon
  label: string
  value: number | string
  hint: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Icon size={19} />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-neutral-900">{value}</p>
          <p className="mt-0.5 text-[11px] font-medium text-amber-700">{hint}</p>
        </div>
      </div>
      <ArrowUpRight size={17} className="text-amber-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
}

export default function EmployeeDashboardPage() {
  const [range, setRange] = useState<RangeKey>("7d")
  const {
    orders: pendingOrders,
    subscriptions: pendingSubscriptions,
    loading: attentionLoading,
  } = useNavCounts()
  const performance = useDashboardPerformance(range)
  const pipelineFeed = useDashboardPipeline()
  const mapFeed = useDashboardMap()

  const rangeLabel = RANGES.find((option) => option.key === range)?.label ?? "7 days"
  const rangeSubtitle = range === "today" ? "today" : range === "7d" ? "in the last 7 days" : "in the last 30 days"
  const currency = performance.currency
  const trend = buildTrend(performance.summary, currency, range, performance.range.from, performance.range.to)
  const origin = buildOrigin(performance.summary, currency)
  const meals = buildMeals(performance.summary, currency)
  const plans = buildPlans(performance.summary, currency)
  const orderTotal = origin.reduce((sum, row) => sum + row.amount, 0)
  const hasSales = trend.some((row) => row.orders > 0 || row.subscriptions > 0)
  const subscriberOverview: SubscriberRow[] = performance.subscriptions.slice(0, 4).map((subscription) => ({
    name: subscription.customer?.name ?? "Guest subscriber",
    plan: subscription.plan?.name ?? "Custom plan",
    status: subscriberStatus(subscription),
    detail: subscriberDetail(subscription),
  }))
  const subscriberTotal = performance.subscriptions.length
  const pipeline: PipelineRow[] = [
    { label: "Inquiry", count: pipelineFeed.counts.inquiry, color: PIPELINE_COLORS.inquiry },
    { label: "Confirmed", count: pipelineFeed.counts.confirmed, color: PIPELINE_COLORS.confirmed },
    { label: "Preparing", count: pipelineFeed.counts.preparing, color: PIPELINE_COLORS.preparing },
    { label: "Ready", count: pipelineFeed.counts.ready_for_pickup, color: PIPELINE_COLORS.ready },
    { label: "Out for delivery", count: pipelineFeed.counts.out_for_delivery, color: PIPELINE_COLORS.out },
  ]
  const pipelineTotal = pipelineFeed.total
  const mapMarkers: MapMarkerRow[] = mapFeed.orders.flatMap((order) => {
    const coords = parseOrderLocation(order.location)
    if (!coords) return []
    return [{
      id: order.id,
      lat: coords.lat,
      lng: coords.lng,
      label: mapOrderLabel(order),
      type: order.status === "confirmed" || order.status === "out_for_delivery" ? "orders" : "today",
    }]
  })
  const maxMealRevenue = Math.max(1, ...meals.map((meal) => meal.revenue))
  const maxPlanRevenue = Math.max(1, ...plans.map((plan) => plan.revenue))

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Live
              </span>
            </div>
            <p className="text-sm text-neutral-500">Sales, operations, and what needs attention</p>
          </div>
        </div>

        <div className="flex w-full items-center gap-1 rounded-2xl bg-neutral-100 p-1 sm:w-auto">
          {RANGES.map((option) => (
            <button
              key={option.key}
              onClick={() => setRange(option.key)}
              className={`flex-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:flex-none ${
                range === option.key
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </motion.div>

      <CollapsibleSection title="Needs attention" hint="Live · clear these first">
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div variants={itemVariants}>
            <AttentionCard
              href="/employee/orders"
              icon={ClipboardList}
              label="Pending orders"
              value={attentionLoading ? "—" : pendingOrders}
              hint={
                attentionLoading
                  ? "Checking orders…"
                  : pendingOrders > 0
                    ? "Awaiting confirmation"
                    : "No orders waiting"
              }
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <AttentionCard
              href="/employee/subscriptions"
              icon={CalendarClock}
              label="Subscription inquiries"
              value={attentionLoading ? "—" : pendingSubscriptions}
              hint={
                attentionLoading
                  ? "Checking inquiries…"
                  : pendingSubscriptions > 0
                    ? "Awaiting approval"
                    : "No inquiries waiting"
              }
            />
          </motion.div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Performance" hint={`${rangeLabel} · Live`}>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard
            icon={CircleDollarSign}
            label="Revenue"
            value={performance.loading ? "—" : formatMoney(performance.revenueCents, performance.currency)}
            delta={formatDelta(performance.revenueDelta)}
            hint={performance.error ? "Unable to load sales" : "Delivered sales + subscriptions"}
            tone="from-brand-900 to-emerald-600"
          />
          <KpiCard
            icon={ShoppingBag}
            label="Orders"
            value={performance.loading ? "—" : String(performance.orders)}
            delta={formatDelta(performance.ordersDelta)}
            hint={performance.error ? "Unable to load orders" : "Delivered orders in range"}
            tone="from-blue-600 to-sky-500"
          />
          <KpiCard
            icon={ReceiptText}
            label="Average Order Value"
            value={performance.loading ? "—" : formatMoney(performance.aovCents, performance.currency, 2)}
            delta={formatDelta(performance.aovDelta)}
            hint={performance.error ? "Unable to load AOV" : "Order sales / delivered orders"}
            tone="from-violet-600 to-purple-500"
          />
          <KpiCard
            icon={ClipboardList}
            label="Active Subscriptions"
            value={performance.loading ? "—" : String(performance.activeSubscriptions)}
            hint={
              performance.error
                ? "Unable to load subscriptions"
                : performance.renewingSoon > 0
                  ? `${performance.renewingSoon} renewing this week`
                  : "No renewals this week"
            }
            tone="from-amber-500 to-orange-500"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Quick actions">
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard key={action.href} {...action} />
          ))}
        </motion.div>
      </CollapsibleSection>

      <CollapsibleSection title="Operations" hint="Order flow and deliveries">
        <div className="space-y-4">
        <motion.div variants={itemVariants}>
          <Panel
            title="Order pipeline"
            subtitle={
              pipelineFeed.loading
                ? "Loading live order flow…"
                : pipelineFeed.error
                  ? "Unable to load order flow"
                  : `${pipelineTotal} active orders`
            }
            action={<span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Live flow</span>}
          >
            <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100">
              {pipeline.map((row) => (
                <div
                  key={row.label}
                  style={{
                    width: pipelineTotal > 0 ? `${(row.count / pipelineTotal) * 100}%` : 0,
                    backgroundColor: row.color,
                  }}
                  title={`${row.label}: ${row.count}`}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {pipeline.map((row) => (
                <div key={row.label} className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.label}
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-neutral-900">
                    {pipelineFeed.loading || pipelineFeed.error ? "—" : row.count}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <motion.div variants={itemVariants} className="xl:col-span-2">
            <Panel
              title="Delivery map"
              subtitle="Confirmed and active orders with locations"
              action={
                <span className="text-[10px] font-semibold text-neutral-400">
                  {mapFeed.loading ? "Loading…" : mapFeed.error ? "—" : `${mapMarkers.length} active`}
                </span>
              }
            >
              <MapboxMap
                markers={mapMarkers}
                defaultStyle="light"
                legend={MAP_LEGEND}
              />
            </Panel>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Panel
              title="Subscribers"
              subtitle="A quick look at recent subscriptions"
              action={
                <span className="text-[10px] font-semibold text-neutral-400">
                  {subscriberTotal > 0
                    ? `${subscriberOverview.length} of ${subscriberTotal}`
                    : "No subscribers"}
                </span>
              }
              className="h-full"
            >
              {performance.subscriptionsLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-neutral-400">Loading subscribers…</div>
              ) : subscriberOverview.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-neutral-500">No subscriptions yet</p>
                  <p className="mt-1 text-xs text-neutral-400">New subscribers will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriberOverview.map((subscriber, index) => (
                    <div key={`${subscriber.name}-${index}`} className="rounded-xl border border-neutral-100 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-bold text-neutral-900">{subscriber.name}</p>
                        <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${SUBSCRIBER_STATUS_STYLES[subscriber.status]}`}>
                          {subscriber.status}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs font-semibold text-neutral-600">{subscriber.plan}</p>
                      <p className="mt-1 text-[11px] font-medium text-neutral-400">{subscriber.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/employee/subscriptions"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-[11px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
              >
                View all subscribers
                <ArrowUpRight size={12} />
              </Link>
            </Panel>
          </motion.div>
        </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Sales performance" hint="Revenue, channels, and best sellers">
        <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <motion.div variants={itemVariants} className="xl:col-span-2">
            <Panel
              title="Revenue trend"
              subtitle={`Order sales and subscription payments · ${rangeSubtitle}`}
              action={
                <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-900" />Orders</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-400" />Subscriptions</span>
                </div>
              }
            >
              {performance.salesLoading ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-neutral-400">Loading sales…</div>
              ) : performance.salesError ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-neutral-400">Unable to load sales</div>
              ) : !hasSales ? (
                <div className="flex h-[260px] flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-neutral-500">No delivered sales in this range</p>
                  <p className="mt-1 text-xs text-neutral-400">Revenue appears once orders are delivered or subscriptions are paid.</p>
                </div>
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#118B50" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#118B50" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="subsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#79AE6F" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#79AE6F" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        interval={range === "30d" ? 4 : 0}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={42}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                        formatter={(value, name) => [
                          formatMoney(Number(value) * 100, currency),
                          name === "orders" ? "Orders" : "Subscriptions",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="orders"
                        stackId="1"
                        stroke="#118B50"
                        strokeWidth={2}
                        fill="url(#ordersFill)"
                      />
                      <Area
                        type="monotone"
                        dataKey="subscriptions"
                        stackId="1"
                        stroke="#79AE6F"
                        strokeWidth={2}
                        fill="url(#subsFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Panel title="Sales by origin" subtitle="Where the revenue comes from" className="h-full">
              {performance.salesLoading ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-neutral-400">Loading sales…</div>
              ) : performance.salesError ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-neutral-400">Unable to load sales</div>
              ) : origin.length === 0 || orderTotal === 0 ? (
                <div className="flex h-[320px] flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-neutral-500">No order sales yet</p>
                  <p className="mt-1 text-xs text-neutral-400">Origin split appears after delivered orders.</p>
                </div>
              ) : (
                <>
                  <div className="relative h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={origin}
                          dataKey="amount"
                          nameKey="origin"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {origin.map((row) => (
                            <Cell key={row.origin} fill={row.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                          formatter={(value) => [formatMoney(Number(value), currency), "Revenue"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Order sales</p>
                      <p className="mt-1 text-lg font-bold text-neutral-900">{formatMoney(orderTotal, currency)}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {origin.map((row) => {
                      const share = Math.round((row.amount / orderTotal) * 100)
                      return (
                        <div key={row.origin} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-neutral-600">
                            <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
                            {row.origin}
                            <span className="text-neutral-400">({share}%)</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-neutral-400">{row.orders} orders</span>
                            <span className="font-semibold text-neutral-900">{formatMoney(row.amount, currency)}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </Panel>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <motion.div variants={itemVariants} className="xl:col-span-2">
            <Panel title="Top meals" subtitle={`Best sellers ${rangeSubtitle}`}>
              {performance.salesLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-neutral-400">Loading meals…</div>
              ) : performance.salesError ? (
                <div className="flex h-40 items-center justify-center text-sm text-neutral-400">Unable to load meals</div>
              ) : meals.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-neutral-500">No meal sales yet</p>
                  <p className="mt-1 text-xs text-neutral-400">Top sellers appear after delivered orders.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {meals.map((meal, index) => (
                    <div key={`${meal.name}-${index}`}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2.5 font-medium text-neutral-700">
                          <span className="flex size-5 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-500">
                            {index + 1}
                          </span>
                          {meal.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-neutral-400">{meal.qty} sold</span>
                          <span className="font-semibold text-neutral-900">{formatMoney(meal.revenue, currency)}</span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-900 to-brand-400"
                          style={{ width: `${(meal.revenue / maxMealRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Panel title="Top plans" subtitle="Subscription revenue by plan" className="h-full">
              {performance.salesLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-neutral-400">Loading plans…</div>
              ) : performance.salesError ? (
                <div className="flex h-40 items-center justify-center text-sm text-neutral-400">Unable to load plans</div>
              ) : plans.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-neutral-500">No subscription revenue yet</p>
                  <p className="mt-1 text-xs text-neutral-400">Top plans appear after payments are recorded.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {plans.map((plan, index) => (
                    <div key={`${plan.name}-${index}`}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-neutral-700">{plan.name}</span>
                        <span className="shrink-0 font-semibold text-neutral-900">{formatMoney(plan.revenue, currency)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-brand-400"
                            style={{ width: `${(plan.revenue / maxPlanRevenue) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-400">{plan.payments} payments</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </motion.div>
        </div>
        </div>
      </CollapsibleSection>
    </motion.div>
  )
}
