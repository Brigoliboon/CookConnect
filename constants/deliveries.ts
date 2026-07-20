import { CUSTOMERS } from "./customers"

export type DeliveryIntent = "today" | "skip" | "delivered"

export interface Delivery {
  id: string
  customerId: string
  customerName: string
  customerAddress: string
  riderId: string | null
  riderName: string | null
  subscriptionId: string
  intent: DeliveryIntent
  note: string
  location: {
    lat: number
    lng: number
    address: string
  } | null
  date: string
}

export const DELIVERY_INTENT_OPTIONS: { label: string; value: DeliveryIntent }[] = [
  { label: "Today", value: "today" },
  { label: "Skip", value: "skip" },
  { label: "Delivered", value: "delivered" },
]

export const DELIVERY_INTENT_BADGE: Record<DeliveryIntent, "success" | "warning" | "info"> = {
  today: "success",
  skip: "warning",
  delivered: "info",
}

export const DELIVERIES: Delivery[] = CUSTOMERS.map((c, i) => ({
  id: `D-00${i + 1}`,
  customerId: c.id,
  customerName: c.name,
  customerAddress: c.address,
  riderId: i < 3 ? `R-00${i + 1}` : null,
  riderName: i < 3 ? ["Kevin Ramos", "Lisa Tan", "Mark Villanueva"][i] : null,
  subscriptionId: `S-00${i + 1}`,
  intent: (["today", "today", "skip", "delivered", "skip", "delivered"] as DeliveryIntent[])[i],
  note: ["Adobong manok please", "Extra serving of rice", "", "", "Out of town", ""][i],
  location: { lat: c.location.lat, lng: c.location.lng, address: c.address },
  date: `2025-07-${20 + i}`,
}))

export const RIDERS = [
  { id: "R-001", name: "Kevin Ramos" },
  { id: "R-002", name: "Lisa Tan" },
  { id: "R-003", name: "Mark Villanueva" },
]
