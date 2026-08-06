"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Download, ChevronDown, Mail, Phone, Receipt, Package, Check } from "lucide-react"
import type { Order, OrderItem } from "@/lib/supabase/models"
import { formatPrice } from "@/utils/mapbox"
import { OrderPrintButton } from "@/components/ui/OrderPrintButton"

const STATUSES = ["inquiry", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"] as const

type StatusFilter = (typeof STATUSES)[number] | "all"

const statusBadge: Record<string, string> = {
  inquiry: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
}

const statusBar: Record<string, string> = {
  inquiry: "bg-amber-500",
  confirmed: "bg-blue-500",
  preparing: "bg-purple-500",
  out_for_delivery: "bg-orange-500",
  delivered: "bg-green-500",
  cancelled: "bg-neutral-300",
}

const statusAvatar: Record<string, string> = {
  inquiry: "from-amber-500 to-amber-600",
  confirmed: "from-blue-500 to-blue-600",
  preparing: "from-purple-500 to-purple-600",
  out_for_delivery: "from-orange-500 to-orange-600",
  delivered: "from-green-500 to-green-600",
  cancelled: "from-neutral-400 to-neutral-500",
}

const statusDot: Record<string, string> = {
  inquiry: "bg-amber-500",
  confirmed: "bg-blue-500",
  preparing: "bg-purple-500",
  out_for_delivery: "bg-orange-500",
  delivered: "bg-green-500",
  cancelled: "bg-neutral-400",
}

interface OrderRow {
  id: string
  name: string
  email: string
  mobileNumber: string
  address: string | null
  status: string
  subtotalCents: number
  shippingCents: number
  currency: string
  createdAt: string
  items: OrderItem[]
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function EmployeeOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("inquiry")
  const [showFilters, setShowFilters] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  async function updateStatus(orderId: string, status: string) {
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
      setOrders((prev) =>
        statusFilter !== "all" && status !== statusFilter
          ? prev.filter((o) => o.id !== orderId)
          : prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      )
    } catch (e) {
      console.error("[ORDERS] Status update error:", e)
    } finally {
      setUpdating(null)
    }
  }

  useEffect(() => {
    const query = statusFilter === "all" ? "" : `?status=${statusFilter}`
    fetch(`/api/orders${query}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch orders")
        return data as (Order & { order_items: OrderItem[] })[]
      })
      .then((data) => {
        setOrders(data.map((o) => ({
          id: o.id,
          name: o.name,
          email: o.email,
          mobileNumber: o.mobile_number,
          address: o.address,
          status: o.status,
          subtotalCents: Number(o.subtotal_cents),
          shippingCents: Number(o.shipping_cents),
          currency: o.currency ?? "AED",
          createdAt: (o.created_at ?? "").split("T")[0],
          items: o.order_items ?? [],
        })))
      })
      .catch((e) => console.error("[ORDERS] Fetch error:", e.message || e))
      .finally(() => setLoading(false))
  }, [statusFilter])

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const matchSearch =
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.email.toLowerCase().includes(search.toLowerCase()) ||
          o.mobileNumber.includes(search)
        return matchSearch
      }),
    [orders, search]
  )

  function exportCSV() {
    const headers = ["Name", "Email", "Mobile", "Status", "Items", "Total", "Created"]
    const rows = filtered.map((o) => [
      o.name,
      o.email,
      o.mobileNumber,
      o.status,
      o.items.reduce((sum, i) => sum + i.qty, 0),
      formatPrice(o.subtotalCents + o.shippingCents),
      o.createdAt,
    ])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "orders.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 px-6 py-10">
      <div>
        <div className="mb-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-900 to-brand-400 text-white shadow-lg">
              <Receipt size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Orders</h1>
              <p className="text-sm text-neutral-500">Review and track customer orders</p>
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full rounded-2xl border border-neutral-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-neutral-900 backdrop-blur-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm font-medium text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 hover:bg-white"
            >
              <ChevronDown size={15} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
              Filters
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm font-medium text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 hover:bg-white"
            >
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 rounded-2xl border border-neutral-200 bg-white/60 p-4 backdrop-blur-sm">
                <div className="flex flex-wrap gap-2">
                  {(["all", ...STATUSES] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s)
                        setLoading(true)
                        setOrders([])
                      }}
                      className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all ${
                        statusFilter === s
                          ? "bg-neutral-900 text-white shadow-sm"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {s === "all" ? "All" : s.replaceAll("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-24">
            <Receipt size={48} className="mb-4 text-neutral-300" />
            <p className="text-lg font-medium text-neutral-500">No orders found</p>
            <p className="mt-1 text-sm text-neutral-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((order, i) => {
              const total = order.subtotalCents + order.shippingCents
              const isOpen = expanded === order.id
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50"
                >
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-neutral-100 to-transparent opacity-50" />
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${statusAvatar[order.status] ?? "from-neutral-500 to-neutral-600"} text-sm font-bold text-white shadow-sm`}>
                        {initials(order.name)}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === order.id ? null : order.id)}
                          disabled={updating === order.id}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all disabled:cursor-not-allowed disabled:opacity-50 ${statusBadge[order.status] ?? "bg-neutral-100 text-neutral-600"}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusDot[order.status] ?? "bg-neutral-400"}`} />
                          {order.status.replaceAll("_", " ")}
                          <ChevronDown size={12} className={`transition-transform ${menuOpen === order.id ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {menuOpen === order.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full z-10 mt-1.5 w-44 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl shadow-neutral-900/10"
                            >
                              {STATUSES.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => {
                                    setMenuOpen(null)
                                    if (s !== order.status) updateStatus(order.id, s)
                                  }}
                                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors ${
                                    s === order.status
                                      ? "bg-neutral-100 text-neutral-900"
                                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                  }`}
                                >
                                  <span className={`size-1.5 rounded-full ${statusDot[s] ?? "bg-neutral-400"}`} />
                                  {s.replaceAll("_", " ")}
                                  {s === order.status && <Check size={12} className="ml-auto text-neutral-900" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="font-semibold text-neutral-900">{order.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
                        <Mail size={12} />
                        {order.email}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
                        <Phone size={12} />
                        {order.mobileNumber}
                      </p>
                      {order.address && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{order.address}</p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                      <span className="flex items-center gap-1.5 text-neutral-500">
                        <Package size={13} />
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </span>
                      <span className="font-bold text-neutral-900">{formatPrice(total)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {order.status === "confirmed" && (
                        <OrderPrintButton
                          order={order}
                          receiptOptions={{ storeName: "CookConnect" }}
                          className="flex-1"
                        />
                      )}
                      <button
                        onClick={() => setExpanded(isOpen ? null : order.id)}
                        className="mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-600 transition-all hover:bg-neutral-900 hover:text-white"
                      >
                        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        {isOpen ? "Hide Items" : "View Items"}
                      </button>
                    </div>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-2 rounded-xl bg-neutral-50 p-3">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-neutral-700">
                                  <Check size={12} className="text-brand-700" />
                                  {item.name}
                                  <span className="text-xs text-neutral-400">x{item.qty}</span>
                                </span>
                                <span className="font-semibold text-neutral-900">{formatPrice(Number(item.unit_price_cents) * item.qty)}</span>
                              </div>
                            ))}
                            {order.shippingCents > 0 && (
                              <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm text-neutral-500">
                                <span>Shipping</span>
                                <span>{formatPrice(order.shippingCents)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-bold text-neutral-900">
                              <span>Total</span>
                              <span>{formatPrice(total)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className={`h-1 w-full ${statusBar[order.status] ?? "bg-neutral-200"}`} />
                </motion.div>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-neutral-400">
          <span>{filtered.length} of {orders.length} orders</span>
        </div>
      </div>
    </div>
  )
}
