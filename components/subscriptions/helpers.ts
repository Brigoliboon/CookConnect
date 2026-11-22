export type Lifecycle = "active" | "paused" | "depleted" | "cancelled"

export interface SubscriptionListItem {
  id: string
  customer_name?: string
  customer_email?: string
  customer?: { name?: string | null; email?: string | null } | null
  details: Record<string, unknown>
  status: "active" | "cancelled"
  paused_at?: string | null
  remaining_meal_count?: number | null
  created_at: string
  expires_at?: string
  plan?: { id: string; name: string; validity_days: number } | null
}

export const AVATAR_STYLES = [
  "bg-[#DBEAFE] text-[#1E3A8A]",
  "bg-[#FEF3C7] text-[#92400E]",
  "bg-[#E0E7FF] text-[#3730A3]",
  "bg-[#FCE7F3] text-[#9D174D]",
  "bg-[#CCFBF1] text-[#115E59]",
  "bg-[#FFEDD5] text-[#9A3412]",
  "bg-[#EDE9FE] text-[#5B21B6]",
] as const

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
  return letters || "?"
}

export function avatarTone(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length]
}

export function displayName(s: SubscriptionListItem) {
  const fromDetails = typeof s.details?.name === "string" ? s.details.name : undefined
  return s.customer_name ?? s.customer?.name ?? fromDetails ?? "Guest"
}

export function displayContact(s: SubscriptionListItem) {
  return (
    (typeof s.details?.mobile_number === "string" ? s.details.mobile_number : undefined)
    ?? s.customer_email
    ?? s.customer?.email
    ?? (typeof s.details?.email === "string" ? s.details.email : undefined)
    ?? ""
  )
}

export function planLabel(s: SubscriptionListItem) {
  return String(s.details?.planName ?? s.plan?.name ?? s.details?.planId ?? "—")
}

export function lifecycleOf(s: SubscriptionListItem): Lifecycle {
  if (s.status === "cancelled") return "cancelled"
  if (s.paused_at) return "paused"
  if (s.remaining_meal_count !== undefined && s.remaining_meal_count !== null && s.remaining_meal_count <= 0) {
    return "depleted"
  }
  return "active"
}

export function daysUntil(iso?: string | null) {
  if (!iso) return null
  const day = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const [year, month, date] = day.split("-").map(Number)
  const expiry = new Date(year, month - 1, date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000)
}

export function entitlementLabel(s: Pick<SubscriptionListItem, "expires_at" | "remaining_meal_count">) {
  const days = daysUntil(s.expires_at)
  if (days !== null) {
    if (days > 1) return `${days} days left`
    if (days === 1) return "1 day left"
    if (days === 0) return "Expires today"
    return "Expired"
  }
  if (s.remaining_meal_count === undefined || s.remaining_meal_count === null) return null
  const meals = s.remaining_meal_count
  return `${meals} meal${meals === 1 ? "" : "s"} left`
}

/** Visual only: same 3-day window already used for renewal reminders (FR-46). */
export function isRenewalDueSoon(s: SubscriptionListItem) {
  if (lifecycleOf(s) !== "active") return false
  const days = daysUntil(s.expires_at)
  return days !== null && days >= 0 && days <= 3
}
