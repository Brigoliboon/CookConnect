"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Search, Download, Mail, Phone, Receipt, Package, Check,
  ShoppingCart, Plus, Minus, Trash2, Flame, ChevronDown,
  User, X, Store, Bike, UtensilsCrossed, Printer, MapPin,
} from "lucide-react"
import type { Order, OrderItem, OrderItemAddon } from "@/lib/supabase/models"
import { formatPrice, resolveDeliveryAddress } from "@/utils/mapbox"
import { OrderPrintButton } from "@/components/ui/OrderPrintButton"
import { Modal } from "@/components/ui/Modal"
import { LocationPicker, type Coordinates } from "@/components/ui/LocationPicker"
import { CartSidePicker } from "@/components/landing/CartSidePicker"

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const fallbackImages: Record<string, string> = {
  beef: "/placeholder/empty_plate.svg",
  chicken: "/placeholder/empty_plate.svg",
  seafood: "/placeholder/empty_plate.svg",
  salad: "/placeholder/empt_salad_bowl.png",
  wrap: "/placeholder/empty_plate.svg",
  breakfast: "/placeholder/empty_bowl.png",
  pasta: "/placeholder/empty_plate.svg",
  soup: "/placeholder/empty_bowl.png",
  pizza: "/placeholder/empty_plate.svg",
  burgers: "/placeholder/empty_plate.svg",
  drinks: "/drink_sample.svg",
  biryani: "/placeholder/empty_plate.svg",
  risotto: "/placeholder/empty_plate.svg",
  smoothie: "/drink_sample.svg",
  juice: "/drink_sample.svg",
  beverages: "/drink_sample.svg",
  desserts: "/drink_sample.svg",
  "rice-sides": "/placeholder/empty_plate.svg",
  platters: "/drink_sample.svg",
  vegetable: "/placeholder/empty_plate.svg",
}

const CATEGORY_FILTERS = [
  { id: "all", label: "All" },
  { id: "meals", label: "Meals", match: ["beef", "chicken", "seafood", "soup", "breakfast", "biryani", "risotto", "vegetable"] },
  { id: "salad", label: "Salads", match: ["salad"] },
  { id: "rice-sides", label: "Rice & Sides", match: ["rice-sides"] },
  { id: "platters", label: "Platters", match: ["platters"] },
  { id: "pasta", label: "Pasta", match: ["pasta"] },
  { id: "wraps", label: "Wraps", match: ["wrap"] },
  { id: "pizza", label: "Pizza", match: ["pizza"] },
  { id: "burgers", label: "Burgers", match: ["burgers"] },
  { id: "desserts", label: "Desserts", match: ["desserts"] },
  { id: "drinks", label: "Drinks", match: ["drinks", "smoothie", "juice", "beverages"] },
]

interface PosServing {
  id: string
  name: string | null
  price: number | null
  calories: number | null
}

interface PosItem {
  id: string
  name: string
  category: string
  description: string
  image: string
  price: number
  calories: number
  servings: PosServing[]
}

interface PosCartLine {
  key: string
  recipeId: string
  servingId: string | null
  servingName: string | null
  name: string
  image: string
  unitPrice: number
  qty: number
  note: string
  addonRecipeId: string | null
  addonName: string | null
  addonExtra: number
}

function mapRecipe(r: Record<string, unknown>): PosItem {
  const category = (r.category as string) ?? ""
  const servings = ((r.servings as Record<string, unknown>[]) ?? [])
    .filter((s) => (s.is_active as boolean) !== false)
    .map((s) => ({
      id: s.id as string,
      name: (s.name as string | null) ?? null,
      price: (s.price as number | null) ?? null,
      calories: (s.calories as number | null) ?? null,
    }))
  const first = servings[0]
  const price = (r.price as number) ?? first?.price ?? 0
  const calories = (r.calories as number) ?? first?.calories ?? 0
  return {
    id: (r.id as string) ?? "",
    name: (r.name as string) ?? "",
    category,
    description: (r.description as string) ?? "",
    image: (r.image_path as string) ?? fallbackImages[category] ?? "/drink_sample.svg",
    price: Number(price) || 0,
    calories: Number(calories) || 0,
    servings,
  }
}

function sanitizeUaLocal(value: string) {
  let d = value.replace(/\D/g, "")
  if (d.startsWith("971")) d = d.slice(3)
  else if (d.startsWith("0971")) d = d.slice(4)
  else if (d.startsWith("0")) d = d.slice(1)
  return d.slice(0, 9)
}

/* ------------------------------------------------------------------ */
/* POS meal card — same grid layout as CategoryMealCard, own styling   */
/* ------------------------------------------------------------------ */

function PosMealCard({
  item,
  qtyInCart,
  onAdd,
  onInc,
  onDec,
}: {
  item: PosItem
  qtyInCart: number
  onAdd: (servingIdx: number) => void
  onInc: () => void
  onDec: () => void
}) {
  const [servingIdx, setServingIdx] = useState(0)
  const [servingOpen, setServingOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const active = item.servings.length > 0 ? item.servings[Math.min(servingIdx, item.servings.length - 1)] : null
  const displayPrice = active?.price ?? item.price
  const displayCalories = active?.calories ?? item.calories

  function handleAdd() {
    onAdd(servingIdx)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/60">
      <div className="relative">
        <Image
          src={item.image || fallbackImages[item.category] || "/drink_sample.svg"}
          alt={item.name}
          width={600}
          height={600}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
        {item.category && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            {item.category}
          </span>
        )}
        {qtyInCart > 0 && (
          <span className="absolute right-2 top-2 flex min-w-7 items-center justify-center rounded-full bg-brand-900 px-2 py-0.5 text-xs font-bold text-white shadow-md">
            ×{qtyInCart}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-sm font-semibold text-neutral-900" title={item.name}>
          {item.name}
        </p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-neutral-500">
            <Flame size={12} className="text-orange-400" />
            {displayCalories} Cal
          </span>
          <span className="text-sm font-bold text-brand-900">AED {Number(displayPrice).toFixed(2)}</span>
        </div>

        {item.servings.length > 1 && (
          <div className="relative mt-2">
            <button
              onClick={() => setServingOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-medium text-neutral-700 transition-colors hover:border-neutral-300"
            >
              <span className="truncate">{active?.name ?? `Serving ${servingIdx + 1}`}</span>
              <ChevronDown size={12} className={`shrink-0 transition-transform ${servingOpen ? "rotate-180" : ""}`} />
            </button>
            {servingOpen && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                {item.servings.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setServingIdx(i); setServingOpen(false) }}
                    className={`flex w-full items-center justify-between px-2 py-1.5 text-[11px] transition-colors hover:bg-neutral-50 ${
                      i === servingIdx ? "bg-neutral-50 font-semibold text-brand-900" : "text-neutral-600"
                    }`}
                  >
                    <span className="truncate">{s.name ?? `Serving ${i + 1}`}</span>
                    {s.price != null && <span className="ml-2 shrink-0 font-semibold">{Number(s.price).toFixed(2)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
          {qtyInCart === 0 ? (
            <button
              onClick={handleAdd}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                added
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-neutral-900 text-white hover:bg-neutral-700 active:scale-95"
              }`}
            >
              {added ? <><Check size={14} /> Added</> : <><ShoppingCart size={14} /> Add</>}
            </button>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <button
                onClick={onDec}
                aria-label="Decrease quantity"
                className="flex size-8 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-100 active:scale-95"
              >
                {qtyInCart === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
              </button>
              <span className="text-sm font-bold text-neutral-900">{qtyInCart}</span>
              <button
                onClick={onInc}
                aria-label="Increase quantity"
                className="flex size-8 items-center justify-center rounded-xl bg-neutral-900 text-white transition-colors hover:bg-neutral-700 active:scale-95"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Orders tab (existing functionality, preserved)                      */
/* ------------------------------------------------------------------ */

const STATUSES = ["inquiry", "confirmed", "ready_for_pickup", "cancelled"] as const
type StatusFilter = (typeof STATUSES)[number] | "all"

const statusBadge: Record<string, string> = {
  inquiry: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  ready_for_pickup: "bg-teal-100 text-teal-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
}
const statusBar: Record<string, string> = {
  inquiry: "bg-amber-500",
  confirmed: "bg-blue-500",
  preparing: "bg-purple-500",
  ready_for_pickup: "bg-teal-500",
  out_for_delivery: "bg-orange-500",
  delivered: "bg-green-500",
  cancelled: "bg-neutral-300",
}
const statusAvatar: Record<string, string> = {
  inquiry: "from-amber-500 to-amber-600",
  confirmed: "from-blue-500 to-blue-600",
  preparing: "from-purple-500 to-purple-600",
  ready_for_pickup: "from-teal-500 to-teal-600",
  out_for_delivery: "from-orange-500 to-orange-600",
  delivered: "from-green-500 to-green-600",
  cancelled: "from-neutral-400 to-neutral-500",
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
  vatCents: number
  currency: string
  createdAt: string
  items: (OrderItem & { addons?: OrderItemAddon[] })[]
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function OrdersPanel({ refreshKey }: { refreshKey: number }) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("inquiry")
  const [updating, setUpdating] = useState<string | null>(null)
  const [itemsDialogId, setItemsDialogId] = useState<string | null>(null)

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
        return data as (Order & { order_items?: (OrderItem & { order_item_addons?: OrderItemAddon[] })[]; items?: (OrderItem & { addons?: OrderItemAddon[] })[] })[]
      })
      .then((data) => {
        setOrders(data.map((o) => {
          const rawItems = o.items ?? o.order_items ?? []
          return {
            id: o.id,
            name: o.name,
            email: o.email,
            mobileNumber: o.mobile_number,
            address: o.address,
            status: o.status,
            subtotalCents: Number(o.subtotal_cents),
            shippingCents: Number(o.shipping_cents),
            vatCents: Number(o.vat_cents ?? Math.round(Number(o.subtotal_cents) * 0.05)),
            currency: o.currency ?? "AED",
            createdAt: (o.created_at ?? "").split("T")[0],
            items: rawItems.map((i) => ({
              ...i,
              addons: (i as OrderItem & { addons?: OrderItemAddon[]; order_item_addons?: OrderItemAddon[] }).addons
                ?? (i as OrderItem & { order_item_addons?: OrderItemAddon[] }).order_item_addons
                ?? [],
            })),
          }
        }))
      })
      .catch((e) => console.error("[ORDERS] Fetch error:", e.message || e))
      .finally(() => setLoading(false))
  }, [statusFilter, refreshKey])

  const filtered = useMemo(
    () => orders.filter((o) => {
      const q = search.toLowerCase()
      return o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.mobileNumber.includes(search)
    }),
    [orders, search],
  )

  const itemsDialogOrder = itemsDialogId ? orders.find((o) => o.id === itemsDialogId) ?? null : null

  function exportCSV() {
    const headers = ["Name", "Email", "Mobile", "Status", "Items", "Total", "Created"]
    const rows = filtered.map((o) => [
      o.name, o.email, o.mobileNumber, o.status,
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
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full rounded-2xl border border-neutral-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-neutral-900 backdrop-blur-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm font-medium text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 hover:bg-white"
        >
          <Download size={15} /> Export
        </button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...STATUSES] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setLoading(true); setOrders([]) }}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all ${
              statusFilter === s ? "bg-neutral-900 text-white shadow-sm" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {s === "all" ? "All" : s.replaceAll("_", " ")}
          </button>
        ))}
      </div>

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
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      disabled={updating === order.id}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all disabled:cursor-not-allowed disabled:opacity-50 ${statusBadge[order.status] ?? "bg-neutral-100 text-neutral-600"}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-semibold text-neutral-900">{order.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500"><Mail size={12} />{order.email}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500"><Phone size={12} />{order.mobileNumber}</p>
                    {order.address && <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{order.address}</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                    <span className="flex items-center gap-1.5 text-neutral-500">
                      <Package size={13} />{order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="font-bold text-neutral-900">{formatPrice(total)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {order.status === "confirmed" && (
                      <OrderPrintButton order={order} receiptOptions={{ storeName: "CookConnect" }} className="flex-1" />
                    )}
                    <button
                      onClick={() => setItemsDialogId(order.id)}
                      className="mt-0 flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-600 transition-all hover:bg-neutral-900 hover:text-white"
                    >
                      View Items
                    </button>
                  </div>
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

      <Modal open={!!itemsDialogOrder} onClose={() => setItemsDialogId(null)} title={itemsDialogOrder ? `Items for ${itemsDialogOrder.name}` : "Items"}>
        {itemsDialogOrder && (
          <div className="space-y-2">
            {itemsDialogOrder.items.map((item) => (
              <div key={item.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-neutral-700">
                    <Check size={12} className="text-brand-700" />
                    {item.name}
                    <span className="text-xs text-neutral-400">x{item.qty}</span>
                  </span>
                  <span className="font-semibold text-neutral-900">{formatPrice(Number(item.unit_price_cents) * item.qty)}</span>
                </div>
                {(item.addons ?? []).map((a) => (
                  <p key={a.id} className="mt-0.5 pl-5 text-xs text-neutral-500">
                    + {a.name}{Number(a.extra_cents) > 0 ? ` (+${formatPrice(Number(a.extra_cents))})` : " (Free)"}
                  </p>
                ))}
                {item.note && <p className="mt-0.5 pl-5 text-xs text-amber-700">{item.note}</p>}
              </div>
            ))}
            {itemsDialogOrder.shippingCents > 0 && (
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm text-neutral-500">
                <span>Shipping</span><span>{formatPrice(itemsDialogOrder.shippingCents)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 text-sm text-neutral-500">
              <span>VAT (5% incl.)</span><span>{formatPrice(itemsDialogOrder.vatCents)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-bold text-neutral-900">
              <span>Total</span><span>{formatPrice(itemsDialogOrder.subtotalCents + itemsDialogOrder.shippingCents)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page: POS + Orders tabs                                             */
/* ------------------------------------------------------------------ */

type OrderType = "dine_in" | "pickup" | "delivery"

export default function EmployeeOrdersPage() {
  const [tab, setTab] = useState<"pos" | "orders">("pos")

  // Catalog state
  const [menu, setMenu] = useState<PosItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [category, setCategory] = useState("all")

  // Cart state
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false) // mobile drawer
  const [customer, setCustomer] = useState({ name: "", mobile: "", address: "" })
  const [orderType, setOrderType] = useState<OrderType>("dine_in")
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [unsupported, setUnsupported] = useState(false)
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false)
  const [feeCents, setFeeCents] = useState<number | null>(null)
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState("")
  const [placedOrder, setPlacedOrder] = useState<{ id: string; total: string } | null>(null)
  const [ordersRefresh, setOrdersRefresh] = useState(0)

  useEffect(() => {
    fetch("/api/recipe?is_active=true&limit=100&sort=name")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch menu")
        return (data.data ?? data) as Record<string, unknown>[]
      })
      .then((data) => setMenu(data.map(mapRecipe)))
      .catch((e) => setMenuError(e.message || "Failed to load menu"))
      .finally(() => setMenuLoading(false))
  }, [])

  const filteredMenu = useMemo(() => {
    const def = CATEGORY_FILTERS.find((c) => c.id === category)
    const q = search.trim().toLowerCase()
    return menu.filter((m) => {
      const matchCat = !def || category === "all" || (def.match ?? []).includes(m.category)
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [menu, category, search])

  const cartQtyByRecipe = useMemo(() => {
    const map = new Map<string, number>()
    for (const line of cart) map.set(line.recipeId, (map.get(line.recipeId) ?? 0) + line.qty)
    return map
  }, [cart])

  function addToCart(item: PosItem, servingIdx: number) {
    const serving = item.servings[Math.min(servingIdx, item.servings.length - 1)] ?? null
    const unitPrice = Number(serving?.price ?? item.price) || 0
    const label = serving?.name ? `${item.name} (${serving.name})` : item.name
    const key = `${item.id}::${serving?.id ?? "base"}`
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key)
      if (existing) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
      return [...prev, {
        key, recipeId: item.id, servingId: serving?.id ?? null, servingName: serving?.name ?? null,
        name: label, image: item.image, unitPrice, qty: 1, note: "",
        addonRecipeId: null, addonName: null, addonExtra: 0,
      }]
    })
  }

  function bumpRecipe(item: PosItem, delta: number) {
    // Adjust the most recent line for that recipe (POS card stepper)
    setCart((prev) => {
      const idx = [...prev].map((l) => l.recipeId).lastIndexOf(item.id)
      if (idx === -1) return prev
      const next = [...prev]
      const line = { ...next[idx], qty: next[idx].qty + delta }
      if (line.qty <= 0) next.splice(idx, 1)
      else next[idx] = line
      return next
    })
  }

  function changeLineQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0),
    )
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  function setLineNote(key: string, note: string) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, note } : l)))
  }

  function setLineSide(key: string, opt: { addon_recipe_id: string; addon_name: string; extra_cents: number } | null) {
    setCart((prev) => prev.map((l) => {
      if (l.key !== key) return l
      if (!opt) return { ...l, addonRecipeId: null, addonName: null, addonExtra: 0 }
      return { ...l, addonRecipeId: opt.addon_recipe_id, addonName: opt.addon_name, addonExtra: opt.extra_cents }
    }))
  }

  function handleOrderTypeChange(next: OrderType) {
    if (next === orderType) return
    setOrderType(next)
    // Reset delivery pin state whenever leaving/entering delivery (mirrors CartDialog pickup toggle)
    setLocation(null)
    setLocating(false)
    setLocationError("")
    setUnsupported(false)
    setDeliveryConfirmed(false)
    setFeeCents(null)
    setCustomer((p) => ({ ...p, address: "" }))
  }

  function handleConfirmLocation() {
    if (!location) {
      setLocationError("Drop a pin on the map first")
      return
    }
    setLocationError("")
    setLocating(true)
    resolveDeliveryAddress(location.lat, location.lng)
      .then((resolved) => {
        setCustomer((p) => ({ ...p, address: resolved.address }))
        if (resolved.area.supported) {
          setFeeCents(resolved.area.feeCents)
          setDeliveryConfirmed(true)
          setUnsupported(false)
        } else {
          setFeeCents(null)
          setDeliveryConfirmed(false)
          setUnsupported(true)
          setLocationError("")
        }
      })
      .catch(() => {
        setLocationError("Could not resolve address for this pin")
      })
      .finally(() => setLocating(false))
  }

  const itemCount = cart.reduce((s, l) => s + l.qty, 0)
  const subtotalCents = cart.reduce(
    (s, l) => s + (Math.round(l.unitPrice * 100) + (l.addonExtra ?? 0)) * l.qty, 0,
  )
  const vatCents = Math.round(subtotalCents * 0.05)
  const shipCents = orderType === "delivery" && feeCents !== null ? feeCents : 0
  const totalCents = subtotalCents + shipCents

  const canPlace =
    cart.length > 0 &&
    customer.name.trim() !== "" &&
    sanitizeUaLocal(customer.mobile).length >= 9 &&
    (orderType !== "delivery" || (deliveryConfirmed && feeCents !== null && customer.address.trim() !== "")) &&
    !placing

  async function placeOrder() {
    if (!canPlace) return
    setPlacing(true)
    setPlaceError("")
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customer.name.trim(),
          email: "",
          mobile_number: `+971${sanitizeUaLocal(customer.mobile)}`,
          address: orderType === "delivery" ? customer.address.trim() : orderType === "pickup" ? "Pickup" : "Dine-in",
          location: orderType === "delivery" ? location : null,
          shipping_cents: shipCents,
          items: cart.map((l) => ({
            recipe_id: l.recipeId,
            addon_recipe_id: l.addonRecipeId,
            name: l.name,
            unit_price_cents: Math.round(l.unitPrice * 100),
            qty: l.qty,
            note: (l.note?.trim() ? `[${orderType.replace("_", " ")}] ${l.note.trim()}` : `[${orderType.replace("_", " ")}]`) || null,
            image_path: l.image ?? null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to place order")
      setPlacedOrder({ id: data.id, total: formatPrice(Number(data.subtotal_cents ?? subtotalCents) + Number(data.shipping_cents ?? 0)) })
      setCart([])
      setCustomer({ name: "", mobile: "", address: "" })
      setLocation(null)
      setDeliveryConfirmed(false)
      setFeeCents(null)
      setUnsupported(false)
      setLocationError("")
      setCartOpen(false)
      setOrdersRefresh((k) => k + 1)
    } catch (e) {
      setPlaceError(e instanceof Error ? e.message : "Failed to place order")
    } finally {
      setPlacing(false)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
  }

  const cartPanel = (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
          <ShoppingCart size={16} /> Current Order
          {itemCount > 0 && (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-bold text-white">{itemCount}</span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50">
              <Trash2 size={12} /> Clear
            </button>
          )}
          <button onClick={() => setCartOpen(false)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 lg:hidden" aria-label="Close cart">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* Customer */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-neutral-100 p-1">
            {([
              { id: "dine_in", label: "Dine-in", icon: UtensilsCrossed },
              { id: "pickup", label: "Pickup", icon: Store },
              { id: "delivery", label: "Delivery", icon: Bike },
            ] as { id: OrderType; label: string; icon: typeof Store }[]).map((o) => (
              <button
                key={o.id}
                onClick={() => handleOrderTypeChange(o.id)}
                className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                  orderType === o.id ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <o.icon size={12} /> {o.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={customer.name}
              onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
              placeholder="Customer name *"
              className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
            />
          </div>
          <div className="flex items-stretch gap-1.5">
            <span className="flex shrink-0 items-center rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2.5 text-xs font-semibold text-neutral-900">+971</span>
            <div className="relative min-w-0 flex-1">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={customer.mobile}
                onChange={(e) => setCustomer((p) => ({ ...p, mobile: sanitizeUaLocal(e.target.value) }))}
                placeholder="5X XXX XXXX *"
                inputMode="numeric"
                className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </div>
          </div>
          {orderType === "delivery" && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <MapPin size={13} />
                Delivery location
                <span className="text-red-500">*</span>
              </label>
              <LocationPicker
                value={location}
                onChange={(loc) => {
                  setLocation(loc)
                  setDeliveryConfirmed(false)
                  setFeeCents(null)
                  setUnsupported(false)
                  setLocationError("")
                }}
              />
              <button
                onClick={handleConfirmLocation}
                disabled={!location || locating}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900/20 py-2 text-xs font-semibold text-neutral-900 transition-all hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {locating ? (
                  "Resolving address…"
                ) : deliveryConfirmed ? (
                  <>
                    <Check size={14} />
                    Location confirmed
                  </>
                ) : (
                  "Confirm location"
                )}
              </button>
              {unsupported && (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold text-red-600">Outside delivery area</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-red-500">
                    This pin is outside our delivery zone. Move the pin or switch to pickup.
                  </p>
                </div>
              )}
              {locationError && !unsupported && <p className="mt-1.5 text-xs text-red-500">{locationError}</p>}
              {customer.address && (
                <input
                  readOnly
                  value={customer.address}
                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-900 outline-none"
                />
              )}
            </div>
          )}
        </div>

        {/* Lines */}
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 py-10">
            <ShoppingCart size={32} className="mb-2 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">Cart is empty</p>
            <p className="mt-0.5 text-xs text-neutral-400">Tap Add on any item</p>
          </div>
        ) : (
          <div className="h-72 space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {cart.map((line) => {
                const lineTotal = (Math.round(line.unitPrice * 100) + (line.addonExtra ?? 0)) * line.qty
                return (
                  <motion.div
                    key={line.key}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="rounded-xl border border-neutral-100 p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {line.image && (
                        <img src={line.image} alt={line.name} width={44} height={44} loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-neutral-900">{line.name}</p>
                        <p className="text-[11px] text-neutral-500">
                          {formatPrice(Math.round(line.unitPrice * 100) + (line.addonExtra ?? 0))}
                          {line.addonName && <span className="text-brand-900"> · +{line.addonName}</span>}
                        </p>
                      </div>
                      <button onClick={() => removeLine(line.key)} className="shrink-0 p-1 text-neutral-300 hover:text-red-500" aria-label="Remove item">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeLineQty(line.key, -1)} className="flex size-6 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100" aria-label="Decrease">
                          <Minus size={11} />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{line.qty}</span>
                        <button onClick={() => changeLineQty(line.key, 1)} className="flex size-6 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100" aria-label="Increase">
                          <Plus size={11} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-neutral-900">{formatPrice(lineTotal)}</span>
                    </div>
                    <div className="mt-2 border-t border-neutral-50 pt-2">
                      <CartSidePicker
                        mealRecipeId={line.recipeId}
                        selectedId={line.addonRecipeId}
                        onSelect={(opt) => setLineSide(line.key, opt)}
                      />
                      <input
                        value={line.note}
                        onChange={(e) => setLineNote(line.key, e.target.value)}
                        placeholder="Note (e.g. no onion)"
                        className="mt-1.5 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                      />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Totals + submit */}
      <div className="border-t border-neutral-100 px-4 py-3">
        <div className="space-y-1 text-xs text-neutral-500">
          <div className="flex justify-between"><span>Subtotal ({itemCount} items)</span><span className="font-semibold text-neutral-900">{formatPrice(subtotalCents)}</span></div>
          <div className="flex justify-between"><span>VAT (5% incl.)</span><span>{formatPrice(vatCents)}</span></div>
          {orderType === "delivery" && (
            <div className="flex justify-between">
              <span>Delivery fee</span>
              <span>{feeCents === null ? "—" : feeCents === 0 ? "Free" : formatPrice(feeCents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-100 pt-1.5 text-sm font-bold text-neutral-900">
            <span>Total</span><span>{formatPrice(totalCents)}</span>
          </div>
        </div>
        {placeError && <p className="mt-2 text-center text-xs text-red-500">{placeError}</p>}
        <button
          onClick={placeOrder}
          disabled={!canPlace}
          className="mt-2.5 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {placing ? "Placing order…" : `Place Order · ${formatPrice(totalCents)}`}
        </button>
        {!canPlace && cart.length > 0 && (
          <p className="mt-1.5 text-center text-[11px] text-neutral-400">Enter customer name + valid mobile{orderType === "delivery" ? " + confirm pin on map" : ""}</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-900 to-brand-400 text-white shadow-lg">
              {tab === "pos" ? <Store size={20} /> : <Receipt size={20} />}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{tab === "pos" ? "Point of Sale" : "Orders"}</h1>
              <p className="text-sm text-neutral-500">{tab === "pos" ? "Take walk-in orders in seconds" : "Review and track customer orders"}</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1 sm:w-auto">
            <button
              onClick={() => setTab("pos")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${tab === "pos" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              <Store size={14} /> POS
            </button>
            <button
              onClick={() => setTab("orders")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${tab === "orders" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              <Receipt size={14} /> Orders
            </button>
          </div>
        </div>

        {tab === "orders" ? (
          <OrdersPanel refreshKey={ordersRefresh} />
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* Catalog column */}
            <div className="min-w-0">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onBlur={() => setSearch(searchInput)}
                  placeholder="Search menu…"
                  className="w-full rounded-2xl border border-neutral-200 bg-white/80 py-3 pl-10 pr-10 text-sm text-neutral-900 backdrop-blur-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setSearch("") }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </form>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {CATEGORY_FILTERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      category === c.id ? "bg-neutral-900 text-white shadow-sm" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-neutral-400">{filteredMenu.length} items{search && <> for “{search}”</>}</p>

              {menuLoading ? (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <li key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-200" />
                  ))}
                </ul>
              ) : menuError ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">{menuError}</div>
              ) : filteredMenu.length === 0 ? (
                <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-20">
                  <UtensilsCrossed size={40} className="mb-3 text-neutral-300" />
                  <p className="text-sm font-medium text-neutral-500">No items found</p>
                  <p className="mt-0.5 text-xs text-neutral-400">Try a different search or category</p>
                </div>
              ) : (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                  {filteredMenu.map((item) => (
                    <PosMealCard
                      key={item.id}
                      item={item}
                      qtyInCart={cartQtyByRecipe.get(item.id) ?? 0}
                      onAdd={(idx) => addToCart(item, idx)}
                      onInc={() => bumpRecipe(item, 1)}
                      onDec={() => bumpRecipe(item, -1)}
                    />
                  ))}
                </ul>
              )}
              <div className="h-24 lg:hidden" />
            </div>

            {/* Cart column — sidebar on desktop */}
            <div className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)]">
              {cartPanel}
            </div>
          </div>
        )}
      </div>

      {/* Mobile / tablet cart: floating bar + drawer */}
      {tab === "pos" && (
        <>
          <AnimatePresence>
            {itemCount > 0 && !cartOpen && (
              <motion.button
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                onClick={() => setCartOpen(true)}
                className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4 text-white shadow-2xl shadow-neutral-900/30 active:scale-[0.99] lg:hidden"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCart size={16} />
                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                </span>
                <span className="text-sm font-bold">{formatPrice(totalCents)}</span>
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {cartOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
                onClick={() => setCartOpen(false)}
              >
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 32 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-x-0 bottom-0 top-10 overflow-hidden rounded-t-3xl bg-neutral-50 sm:inset-x-auto sm:right-0 sm:top-0 sm:w-[420px] sm:rounded-l-3xl sm:rounded-tr-none"
                >
                  <div className="h-full p-3">{cartPanel}</div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Order success */}
      <Modal open={!!placedOrder} onClose={() => setPlacedOrder(null)} title="Order placed">
        {placedOrder && (
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={28} />
            </div>
            <p className="mt-4 text-lg font-bold text-neutral-900">{placedOrder.total}</p>
            <p className="mt-1 break-all text-xs text-neutral-500">Order #{placedOrder.id}</p>
            <p className="mt-2 text-sm text-neutral-500">Find it under Orders → Inquiry.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setPlacedOrder(null); setTab("orders") }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <Printer size={14} /> View order
              </button>
              <button
                onClick={() => setPlacedOrder(null)}
                className="rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                New sale
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
