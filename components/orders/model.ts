import type { OrderItem, OrderItemAddon, OrderStatus } from "@/lib/supabase/models"

export type OrderTabKey =
  | "inquiry"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"

export interface OrderTab {
  key: OrderTabKey
  label: string
  status: OrderStatus
  kind: string
}

export const ORDER_TABS: OrderTab[] = [
  { key: "inquiry", label: "Inquiry", status: "inquiry", kind: "inquiry" },
  { key: "confirmed", label: "Confirmed", status: "confirmed", kind: "confirmed" },
  { key: "preparing", label: "Preparing", status: "preparing", kind: "preparing" },
  { key: "ready", label: "Ready", status: "ready_for_pickup", kind: "ready" },
  { key: "completed", label: "Completed", status: "delivered", kind: "completed" },
  { key: "cancelled", label: "Cancelled", status: "cancelled", kind: "cancelled" },
]

export const TAB_STYLES: Record<string, { idle: string; active: string }> = {
  inquiry: {
    idle: "text-[#92400E]",
    active: "bg-[#FEF3C7] text-[#92400E] font-semibold",
  },
  confirmed: {
    idle: "text-[#1E40AF]",
    active: "bg-[#DBEAFE] text-[#1E40AF] font-semibold",
  },
  preparing: {
    idle: "text-[#5B21B6]",
    active: "bg-[#EDE9FE] text-[#5B21B6] font-semibold",
  },
  ready: {
    idle: "text-[#0F766E]",
    active: "bg-[#CCFBF1] text-[#0F766E] font-semibold",
  },
  completed: {
    idle: "text-[#3F6212]",
    active: "bg-[#F0FDF4] text-[#3F6212] font-semibold",
  },
  cancelled: {
    idle: "text-[#BE123C]",
    active: "bg-[#FFE4E6] text-[#BE123C] font-semibold",
  },
}

export const AVATAR_STYLES = [
  "bg-[#DBEAFE] text-[#1E3A8A]",
  "bg-[#FEF3C7] text-[#92400E]",
  "bg-[#E0E7FF] text-[#3730A3]",
  "bg-[#FCE7F3] text-[#9D174D]",
  "bg-[#CCFBF1] text-[#115E59]",
  "bg-[#FFEDD5] text-[#9A3412]",
  "bg-[#EDE9FE] text-[#5B21B6]",
]

export const CHANGEABLE_STATUSES: { status: OrderStatus; label: string }[] = [
  { status: "inquiry", label: "Inquiry" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" },
  { status: "ready_for_pickup", label: "Ready" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
]

export interface BoardOrder {
  id: string
  name: string
  email: string
  mobileNumber: string
  address: string | null
  status: OrderStatus
  subtotalCents: number
  shippingCents: number
  vatCents: number
  currency: string
  createdAt: string
  deliveredAt: string | null
  location: unknown
  details: Record<string, unknown> | null
  items: (OrderItem & { addons?: OrderItemAddon[] })[]
}

export function tabForStatus(status: OrderStatus): OrderTab | undefined {
  return ORDER_TABS.find((tab) => tab.status === status)
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function avatarClass(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 2147483647
  return AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length]
}

export function isPickupOrder(order: Pick<BoardOrder, "address">) {
  return !order.address?.trim()
}

export function itemCount(items: { qty: number }[]) {
  return items.reduce((sum, item) => sum + (item.qty ?? 1), 0)
}

export function exclusiveSubtotal(order: Pick<BoardOrder, "subtotalCents" | "vatCents">) {
  return Math.max(0, order.subtotalCents - order.vatCents)
}

export function orderTotal(order: Pick<BoardOrder, "subtotalCents" | "shippingCents">) {
  return order.subtotalCents + order.shippingCents
}

export function shortOrderId(id: string) {
  return id.replaceAll("-", "").slice(-4).toUpperCase()
}

export function sevenDaysAgoIso() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString()
}

export interface NextStep {
  status: OrderStatus
  cardLabel: string
  panelLabel: string
}

export function nextStep(status: OrderStatus, pickup: boolean): NextStep | null {
  if (status === "inquiry") {
    return { status: "confirmed", cardLabel: "Confirm", panelLabel: "Confirm order" }
  }
  if (status === "confirmed") {
    return { status: "preparing", cardLabel: "Start preparing", panelLabel: "Start preparing" }
  }
  if (status === "preparing") {
    return { status: "ready_for_pickup", cardLabel: "Mark ready", panelLabel: "Mark ready" }
  }
  if (status === "ready_for_pickup") {
    if (pickup) {
      return { status: "delivered", cardLabel: "Complete", panelLabel: "Complete order" }
    }
    return { status: "out_for_delivery", cardLabel: "Hand off", panelLabel: "Hand off for delivery" }
  }
  return null
}

export function formatOrderWhen(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
  if (sameDay) return `Today, ${time}`
  const day = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date)
  return `${day}, ${time}`
}

export type MapPoint = { lat: number; lng: number }

export function mapPoint(location: unknown): MapPoint | null {
  if (!location || typeof location !== "object") return null
  const value = location as Record<string, unknown>
  if (typeof value.lat === "number" && typeof value.lng === "number") {
    return { lat: value.lat, lng: value.lng }
  }
  if (typeof value.latitude === "number" && typeof value.longitude === "number") {
    return { lat: value.latitude, lng: value.longitude }
  }
  const coords = value.coordinates
  if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
    return { lng: coords[0], lat: coords[1] }
  }
  return null
}

export function mapsUrl(order: Pick<BoardOrder, "address" | "location">) {
  const point = mapPoint(order.location)
  if (point) return `https://www.google.com/maps?q=${point.lat},${point.lng}`
  if (order.address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address.trim())}`
  }
  return null
}

export function orderNote(order: Pick<BoardOrder, "details">) {
  const note = order.details?.note
  return typeof note === "string" && note.trim() ? note.trim() : null
}
