import type { UserRole } from "@/lib/supabase/models"

export type NotificationType = "order_inquiry_created" | "order_status_changed"

export interface PushPayload {
  title: string
  body: string
  data: {
    orderId?: string
    status?: string
    url: string
  }
}

export interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth: string
  user_id: string
}

export type RoleTarget = Extract<UserRole, "employee" | "admin" | "rider" | "customer">
