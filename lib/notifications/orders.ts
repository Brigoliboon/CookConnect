import type { SupabaseClient } from "@supabase/supabase-js"
import type { Order } from "@/lib/supabase/models"
import { sendPushToRoles } from "./push"
import type { PushPayload } from "./types"

const EMPLOYEE_URL = "/employee/deliveries"

function formatTotal(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency}`
}

export function buildOrderCreated(order: Order, itemCount: number): PushPayload {
  return {
    title: "New order received",
    body: `${order.name} — ${itemCount} items, ${formatTotal(order.subtotal_cents + order.shipping_cents, order.currency)}`,
    data: { orderId: order.id, status: order.status, url: EMPLOYEE_URL },
  }
}

export function buildOrderStatusChanged(order: Order): PushPayload {
  return {
    title: `Order ${order.status.replaceAll("_", " ")}`,
    body: `${order.name} — order ${order.id.slice(0, 8)} is now ${order.status.replaceAll("_", " ")}`,
    data: { orderId: order.id, status: order.status, url: EMPLOYEE_URL },
  }
}

export async function notifyOrderCreated(
  client: SupabaseClient,
  order: Order,
  itemCount: number,
): Promise<void> {
  await sendPushToRoles(client, ["employee"], "order_inquiry_created", buildOrderCreated(order, itemCount))
}

export async function notifyOrderStatusChanged(client: SupabaseClient, order: Order): Promise<void> {
  await sendPushToRoles(client, ["employee"], "order_status_changed", buildOrderStatusChanged(order))
}
