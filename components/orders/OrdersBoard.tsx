"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  CircleCheck,
  CircleHelp,
  CircleX,
  ClipboardList,
  CookingPot,
  Download,
  Ellipsis,
  List,
  Monitor,
  PackageCheck,
  Receipt,
  Search,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Order, OrderItem, OrderItemAddon, OrderStatus } from "@/lib/supabase/models"
import { formatPrice } from "@/utils/mapbox"
import { OrderCard } from "./OrderCard"
import { OrderDetailPanel } from "./OrderDetailPanel"
import {
  ORDER_TABS,
  TAB_STYLES,
  itemCount,
  orderTotal,
  sevenDaysAgoIso,
  tabForStatus,
  type BoardOrder,
  type OrderTabKey,
} from "./model"

const TAB_ICONS: Record<OrderTabKey, LucideIcon> = {
  inquiry: CircleHelp,
  confirmed: CircleCheck,
  preparing: CookingPot,
  ready: PackageCheck,
  completed: CircleCheck,
  cancelled: CircleX,
}

type Counts = Record<OrderTabKey, number>

const EMPTY_COUNTS: Counts = {
  inquiry: 0,
  confirmed: 0,
  preparing: 0,
  ready: 0,
  completed: 0,
  cancelled: 0,
}

const EMPTY_ORDERS: BoardOrder[] = []

function mapOrder(
  order: Order & {
    order_items?: (OrderItem & { order_item_addons?: OrderItemAddon[] })[]
    items?: (OrderItem & { addons?: OrderItemAddon[]; order_item_addons?: OrderItemAddon[] })[]
  },
): BoardOrder {
  const rawItems = order.items ?? order.order_items ?? []
  return {
    id: order.id,
    name: order.name,
    email: order.email,
    mobileNumber: order.mobile_number,
    address: order.address,
    status: order.status,
    subtotalCents: Number(order.subtotal_cents),
    shippingCents: Number(order.shipping_cents),
    vatCents: Number(order.vat_cents ?? Math.round(Number(order.subtotal_cents) * 0.05)),
    currency: order.currency ?? "AED",
    createdAt: order.created_at,
    deliveredAt: order.delivered_at ?? null,
    location: order.location,
    details: (order.details as Record<string, unknown> | null) ?? null,
    items: rawItems.map((item) => ({
      ...item,
      addons:
        (item as OrderItem & { addons?: OrderItemAddon[]; order_item_addons?: OrderItemAddon[] }).addons ??
        (item as OrderItem & { order_item_addons?: OrderItemAddon[] }).order_item_addons ??
        [],
    })),
  }
}

function parseCounts(payload: unknown): Counts {
  const data = (payload ?? {}) as Record<string, number>
  return {
    inquiry: Number(data.inquiry) || 0,
    confirmed: Number(data.confirmed) || 0,
    preparing: Number(data.preparing) || 0,
    ready: Number(data.ready_for_pickup ?? data.ready) || 0,
    completed: Number(data.delivered ?? data.completed) || 0,
    cancelled: Number(data.cancelled) || 0,
  }
}


async function fetchOrderRows(url: string): Promise<BoardOrder[]> {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? "Failed to fetch orders")
  return (data as Parameters<typeof mapOrder>[0][]).map(mapOrder)
}

async function fetchCounts(url: string): Promise<Counts> {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? "Failed to fetch order counts")
  return parseCounts(data)
}

export function OrdersBoard() {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<OrderTabKey>("inquiry")
  const [completedWindow, setCompletedWindow] = useState<"7d" | "all">("7d")
  const [updating, setUpdating] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const headerMenuRef = useRef<HTMLDivElement>(null)

  const activeTab = ORDER_TABS.find((item) => item.key === tab) ?? ORDER_TABS[0]
  const since = tab === "completed" && completedWindow === "7d" ? sevenDaysAgoIso() : undefined
  const ordersUrl = `/api/orders?status=${activeTab.status}${since ? `&since=${encodeURIComponent(since)}` : ""}`
  const countsUrl = completedWindow === "7d"
    ? `/api/orders?counts=true&since=${encodeURIComponent(sevenDaysAgoIso())}`
    : "/api/orders?counts=true"

  const { data: orderRows, isLoading: loading, mutate: mutateOrders } = useSWR(ordersUrl, fetchOrderRows, {
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  })
  const { data: countPayload, mutate: mutateCounts } = useSWR(countsUrl, fetchCounts, {
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  })
  const orders = orderRows ?? EMPTY_ORDERS
  const counts = countPayload ?? EMPTY_COUNTS

  useEffect(() => {
    if (!headerMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!headerMenuRef.current?.contains(event.target as Node)) setHeaderMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHeaderMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [headerMenuOpen])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return orders
    return orders.filter((order) =>
      order.name.toLowerCase().includes(query) ||
      order.email.toLowerCase().includes(query) ||
      order.mobileNumber.toLowerCase().includes(query) ||
      (order.address ?? "").toLowerCase().includes(query),
    )
  }, [orders, search])

  const openOrder = openId ? orders.find((order) => order.id === openId) ?? null : null

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error("[ORDERS] Status update failed:", err.error)
        return
      }
      if (tabForStatus(status)?.key !== tab && openId === orderId) setOpenId(null)
      await Promise.all([mutateOrders(), mutateCounts()])
    } catch (error) {
      console.error("[ORDERS] Status update error:", error)
    } finally {
      setUpdating(null)
    }
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Mobile", "Status", "Items", "Total", "Created"]
    const rows = filtered.map((order) => [
      order.name,
      order.email,
      order.mobileNumber,
      order.status,
      itemCount(order.items),
      formatPrice(orderTotal(order)),
      order.createdAt,
    ])
    const csv = [headers, ...rows].map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    ).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "orders.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[#0F172A] md:text-2xl">
            <ClipboardList size={22} className="text-[#475569]" />
            Orders
          </h1>
          <p className="mt-2 text-sm text-[#475569] md:text-base">Review and track customer orders</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div ref={headerMenuRef} className="relative">
            <button
              type="button"
              aria-label="More order actions"
              aria-expanded={headerMenuOpen}
              onClick={() => setHeaderMenuOpen((open) => !open)}
              className="flex size-12 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
            >
              <Ellipsis size={20} />
            </button>
            {headerMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                <button
                  type="button"
                  onClick={() => {
                    setHeaderMenuOpen(false)
                    exportCSV()
                  }}
                  className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                >
                  <Download size={16} className="text-[#475569]" />
                  Export
                </button>
              </div>
            )}
          </div>
          <Link
            href="/employee/orders/pos"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-5 text-base font-semibold text-white transition-colors hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
          >
            <Monitor size={18} />
            <span className="md:hidden">POS</span>
            <span className="hidden md:inline">Open POS</span>
          </Link>
        </div>
      </div>

      <div className="relative mb-5">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#475569]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search orders..."
          className="h-12 w-full rounded-xl border border-[#64748B] bg-white pr-4 pl-11 text-base text-[#1E293B] placeholder:text-[#475569] focus:outline-2 focus:outline-offset-2 focus:outline-[#15803D]"
        />
      </div>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        {ORDER_TABS.map((item) => {
          const Icon = TAB_ICONS[item.key]
          const active = item.key === tab
          const styles = TAB_STYLES[item.kind]
          const count = counts[item.key]
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(item.key)
                setOpenId(null)
              }}
              className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm leading-none whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
                active ? styles.active : `${styles.idle} hover:bg-[rgba(15,23,42,0.04)] font-medium`
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              <span className="font-semibold tabular-nums">{count}</span>
            </button>
          )
        })}
      </div>

      {tab === "completed" && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-sm text-[#475569]">Show</span>
          <div className="flex rounded-xl bg-[#F1F5F9] p-1">
            {([
              ["7d", "Last 7 days"],
              ["all", "All"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCompletedWindow(value)}
                className={`h-10 rounded-lg px-3 text-sm font-medium transition-colors ${
                  completedWindow === value
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#475569] hover:text-[#1E293B]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-2xl bg-[#E2E8F0]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-white py-24">
          <Receipt size={48} className="mb-4 text-[#CBD5E1]" />
          <p className="text-lg font-medium text-[#475569]">No orders found</p>
          <p className="mt-1 text-sm text-[#64748B]">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={openId === order.id}
              updating={updating === order.id}
              onOpen={setOpenId}
              onUpdateStatus={updateStatus}
            />
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center gap-2 text-base text-[#475569]">
        <List size={16} className="text-[#64748B]" />
        {filtered.length} {activeTab.label.toLowerCase()} {filtered.length === 1 ? "order" : "orders"}
        {tab === "completed" && completedWindow === "7d" ? " in the last 7 days" : ""}
      </p>

      {openOrder && (
        <OrderDetailPanel
          order={openOrder}
          updating={updating === openOrder.id}
          onClose={() => setOpenId(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  )
}
