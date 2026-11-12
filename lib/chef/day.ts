export const MIN_MEALS_PER_DAY = 1
export const MAX_MEALS_PER_DAY = 5
export const LOOKBACK_DAYS = 7
export const BREAKFAST_CATEGORY = "breakfast"

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

export type SubDetails = Record<string, unknown> | null

export interface DaySub {
  status: string
  paused_at: string | null
  details: SubDetails
}

export function clampMealsPerDay(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return MIN_MEALS_PER_DAY
  return Math.min(MAX_MEALS_PER_DAY, Math.max(MIN_MEALS_PER_DAY, Math.round(n)))
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function weekdayOf(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

export function addCalendarDays(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return toISODate(new Date(y, m - 1, d + days))
}

export function deliveryDays(details: SubDetails): string[] {
  const d = details ?? {}
  const days = d.days as string[] | undefined
  return Array.isArray(days) ? days.map((v) => String(v).toLowerCase()) : []
}

export function deliverySlots(details: SubDetails): string[] {
  const d = details ?? {}
  if (Array.isArray(d.slots)) return (d.slots as unknown[]).map((s) => String(s).toLowerCase())
  if (typeof d.slot === "string" && d.slot) return [d.slot.toLowerCase()]
  return []
}

export function hasBreakfast(details: SubDetails): boolean {
  return (details ?? {}).breakfast === true
}

export function mealsPerDayOf(details: SubDetails): number {
  return clampMealsPerDay((details ?? {}).mealsPerDay)
}

/** Recipe IDs a Flexible customer picked. Empty for Normal / chef's choice. */
export function preferredRecipeIds(details: SubDetails): string[] {
  const d = details ?? {}
  if (d.mode !== "flexible") return []
  const list = d.includedMeals
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const id = String(item ?? "").trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/** True when this sub shows on Thursday only because its Friday delivery moved (closed Fridays). */
export function isFridayDelivery(sub: DaySub, date: string): boolean {
  if (weekdayOf(date.slice(0, 10)) !== "thursday") return false
  const days = deliveryDays(sub.details)
  return days.length > 0 && !days.includes("thursday") && days.includes("friday")
}

/** Thursday + Friday paid days: cook two days of meals on Thursday. */
export function isDoubleThursday(sub: DaySub, date: string): boolean {
  if (weekdayOf(date.slice(0, 10)) !== "thursday") return false
  const days = deliveryDays(sub.details)
  return days.includes("thursday") && days.includes("friday")
}

export function activeOn(sub: DaySub, date: string): boolean {
  if (sub.status !== "active") return false
  if (sub.paused_at) return false
  const day = date.slice(0, 10)
  const details = (sub.details ?? {}) as Record<string, unknown>
  if (details.onCall) return false
  const days = deliveryDays(sub.details)
  if (days.length === 0) return true
  const wd = weekdayOf(day)
  if (days.includes(wd)) return true
  // Closed on Fridays: Friday deliveries are cooked on Thursday
  if (wd === "friday") return false
  if (wd === "thursday" && days.includes("friday")) return true
  return false
}

export interface AssignmentNeed {
  mealsPerDay: number
  dayMultiplier: number
  breakfastCount: number
  mainCount: number
  totalCount: number
  isFridayMoved: boolean
  isDoubleThursday: boolean
}

export function assignmentNeed(sub: DaySub, date: string): AssignmentNeed {
  const mealsPerDay = mealsPerDayOf(sub.details)
  const double = isDoubleThursday(sub, date)
  const moved = isFridayDelivery(sub, date)
  const dayMultiplier = double ? 2 : 1
  const breakfastCount = hasBreakfast(sub.details) ? dayMultiplier : 0
  const mainCount = mealsPerDay * dayMultiplier
  return {
    mealsPerDay,
    dayMultiplier,
    breakfastCount,
    mainCount,
    totalCount: mainCount + breakfastCount,
    isFridayMoved: moved,
    isDoubleThursday: double,
  }
}
