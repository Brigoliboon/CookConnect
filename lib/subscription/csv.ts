import { DELIVERY_DAYS, PAYMENT_METHODS } from "@/constants/subscriptions"
import { catalogPlanFromInput } from "@/lib/subscription/plan"
import {
  appendRestrictionLeftoversToNotes,
  resolveRestrictionLabels,
} from "@/lib/subscription/restrictions"

export const SUBSCRIPTION_CSV_HEADERS = [
  "name",
  "email",
  "mobile_number",
  "address",
  "plan",
  "mode",
  "meals_per_day",
  "breakfast",
  "drinks",
  "cakes",
  "restrictions",
  "included_meals",
  "days",
  "slots",
  "on_call",
  "started_at",
  "expires_at",
  "total_aed",
  "paid_aed",
  "payment_method",
  "payment_reference",
  "notes",
  "paused",
  "remaining_meals",
  "delivery_time",
  "latitude",
  "longitude",
] as const

export const SUBSCRIPTION_CSV_SHORT_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  mobile_number: "Mobile",
  address: "Address",
  plan: "Plan",
  mode: "Mode",
  meals_per_day: "Meals/day",
  breakfast: "Breakfast",
  drinks: "Drinks",
  cakes: "Cakes",
  restrictions: "Restrictions",
  included_meals: "Meals",
  days: "Days",
  slots: "Slots",
  on_call: "On-call",
  started_at: "Start",
  expires_at: "Expiry",
  total_aed: "Total",
  paid_aed: "Paid",
  payment_method: "Method",
  payment_reference: "Ref",
  notes: "Notes",
  paused: "Paused",
  remaining_meals: "Left",
  delivery_time: "Time",
  latitude: "Lat",
  longitude: "Lng",
}

const DAY_ALIASES: Record<string, string> = Object.fromEntries(
  DELIVERY_DAYS.flatMap((day) => [
    [day.value, day.value],
    [day.label.toLowerCase(), day.value],
    [day.value.slice(0, 3), day.value],
  ]),
)

const SLOT_ALIASES: Record<string, "morning" | "noon" | "evening"> = {
  morning: "morning",
  am: "morning",
  noon: "noon",
  lunch: "noon",
  midday: "noon",
  evening: "evening",
  pm: "evening",
  dinner: "evening",
}

const METHOD_ALIASES: Record<string, string> = {
  cash: "cod",
  ...Object.fromEntries(
    PAYMENT_METHODS.flatMap((method) => [
      [method.value, method.value],
      [method.label.toLowerCase(), method.value],
    ]),
  ),
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SubscriptionCsvLookups = {
  recipesByName?: Map<string, string>
  ingredientsByName?: Map<string, { id: string; name: string }>
  subscriptionRecipeIds?: string[]
}

export type ParsedSubscriptionCsvRow = {
  planId: string
  planName: string
  planType: "standard" | "healthy"
  durationDays: number
  name: string
  email: string | null
  mobile_number: string
  address: string
  mode: "normal" | "flexible"
  restrictionIds: string[]
  restrictionNames: Record<string, string>
  restrictedCategories: string[]
  mealsPerDay: number
  breakfast: boolean
  drinks: boolean
  cakes: boolean
  includedMeals: string[]
  days: string[]
  slots: string[]
  onCall: boolean
  started_at?: string
  expires_at?: string
  total_cents?: number
  paid_cents: number
  payment_method: string | null
  payment_reference: string | null
  paymentStatus: "pending" | "partial" | "paid"
  notes: string | null
  paused: boolean
  remaining_meals?: number
  deliveryTime: string | null
  location: { lat: number; lng: number } | null
}

function cell(col: Record<string, string>, key: string): string {
  return (col[key] ?? "").trim()
}

function splitList(value: string): string[] {
  if (!value.trim()) return []
  return value
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function splitTokens(value: string): string[] {
  if (!value.trim()) return []
  return value
    .split(/[;|,]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseBool(value: string, field: string): boolean | null {
  const key = value.trim().toLowerCase()
  if (!key) return null
  if (/^(yes|true|1|y)$/.test(key)) return true
  if (/^(no|false|0|n)$/.test(key)) return false
  throw new Error(`${field} must be yes or no`)
}

function sanitizeUaLocal(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("971")) digits = digits.slice(3)
  else if (digits.startsWith("0971")) digits = digits.slice(4)
  else if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(0, 9)
}

function parseDate(value: string, field: string): string | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`${field} must be YYYY-MM-DD`)
  const date = new Date(`${raw}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new Error(`${field} is not a valid date`)
  }
  return date.toISOString()
}

function parseAedToCents(value: string, field: string): number | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`${field} must be a number 0 or greater`)
  return Math.round(amount * 100)
}

function resolveRestrictions(
  names: string[],
  ingredientsByName?: Map<string, { id: string; name: string }>,
) {
  return resolveRestrictionLabels(names, ingredientsByName ?? new Map())
}

function resolveIncludedMeals(
  names: string[],
  recipesByName?: Map<string, string>,
  fallbackIds?: string[],
): string[] {
  if (names.length === 0) return fallbackIds ?? []
  const ids: string[] = []
  const missing: string[] = []
  for (const name of names) {
    if (UUID_RE.test(name)) {
      ids.push(name)
      continue
    }
    const id = recipesByName?.get(name.toLowerCase())
    if (!id) missing.push(name)
    else ids.push(id)
  }
  if (missing.length > 0) {
    throw new Error(`Unknown included meal${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`)
  }
  return ids
}

function parseOptionalInt(value: string, field: string): number | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) throw new Error(`${field} must be a whole number 0 or greater`)
  return n
}

function parseOptionalCoord(value: string, field: string): number | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new Error(`${field} must be a number`)
  return n
}

export function parseSubscriptionCsvRow(
  col: Record<string, string>,
  lookups: SubscriptionCsvLookups = {},
): ParsedSubscriptionCsvRow {
  const name = cell(col, "name")
  const address = cell(col, "address")
  const planRaw = cell(col, "plan")
  const mobileRaw = cell(col, "mobile_number")
  if (!name) throw new Error("name is required")
  if (!address) throw new Error("address is required")
  if (!planRaw) throw new Error("plan is required")
  if (!mobileRaw) throw new Error("mobile_number is required")

  const local = sanitizeUaLocal(mobileRaw)
  if (local.length !== 9) throw new Error("mobile_number must be a UAE number (9 digits after +971)")

  const catalog = catalogPlanFromInput(planRaw)
  if (!catalog) throw new Error(`Unknown plan "${planRaw}"`)

  const emailRaw = cell(col, "email")
  if (emailRaw && !emailRaw.includes("@")) throw new Error("email is invalid")

  const modeRaw = cell(col, "mode").toLowerCase()
  let mode: "normal" | "flexible" = "normal"
  if (modeRaw) {
    if (modeRaw !== "normal" && modeRaw !== "flexible") throw new Error("mode must be normal or flexible")
    mode = modeRaw
  }

  const mealsRaw = cell(col, "meals_per_day")
  let mealsPerDay = 1
  if (mealsRaw) {
    const n = Number(mealsRaw)
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error("meals_per_day must be a whole number between 1 and 5")
    mealsPerDay = n
  }

  const breakfast = parseBool(cell(col, "breakfast"), "breakfast") ?? false
  const drinks = parseBool(cell(col, "drinks"), "drinks") ?? false
  const cakes = parseBool(cell(col, "cakes"), "cakes") ?? false
  const restrictionLabels = splitList(cell(col, "restrictions"))
  const includedMealNames = splitList(cell(col, "included_meals"))

  const restrictions = resolveRestrictions(restrictionLabels, lookups.ingredientsByName)
  const includedMeals = mode === "flexible"
    ? resolveIncludedMeals(includedMealNames, lookups.recipesByName, lookups.subscriptionRecipeIds)
    : []

  const days: string[] = []
  for (const token of splitTokens(cell(col, "days"))) {
    const day = DAY_ALIASES[token.toLowerCase()]
    if (!day) throw new Error(`Unknown delivery day "${token}"`)
    if (!days.includes(day)) days.push(day)
  }

  const slots: Array<"morning" | "noon" | "evening"> = []
  for (const token of splitTokens(cell(col, "slots"))) {
    const slot = SLOT_ALIASES[token.toLowerCase()]
    if (!slot) throw new Error(`Unknown delivery slot "${token}"`)
    if (!slots.includes(slot)) slots.push(slot)
  }

  const onCall = parseBool(cell(col, "on_call"), "on_call") ?? days.length === 0
  if (!onCall && days.length === 0) throw new Error("days is required unless on_call is yes")
  const resolvedSlots = onCall ? [] : (slots.length > 0 ? slots : ["morning"])

  const started_at = parseDate(cell(col, "started_at"), "started_at")
  const expires_at = parseDate(cell(col, "expires_at"), "expires_at")
  if (started_at && expires_at && new Date(expires_at).getTime() < new Date(started_at).getTime()) {
    throw new Error("expires_at must be on or after started_at")
  }

  const total_cents = parseAedToCents(cell(col, "total_aed"), "total_aed")
  const paid_cents = parseAedToCents(cell(col, "paid_aed"), "paid_aed") ?? 0
  if (paid_cents > 0 && total_cents === undefined) throw new Error("total_aed is required when paid_aed is set")
  if (total_cents !== undefined && paid_cents > total_cents) throw new Error("paid_aed cannot exceed total_aed")

  const methodRaw = cell(col, "payment_method")
  let payment_method: string | null = null
  if (methodRaw) {
    payment_method = METHOD_ALIASES[methodRaw.toLowerCase()] ?? null
    if (!payment_method) throw new Error(`Unknown payment_method "${methodRaw}"`)
  }

  let paymentStatus: "pending" | "partial" | "paid" = "pending"
  if (total_cents !== undefined) {
    if (paid_cents <= 0) paymentStatus = "pending"
    else if (paid_cents < total_cents) paymentStatus = "partial"
    else paymentStatus = "paid"
  }

  const paused = parseBool(cell(col, "paused"), "paused") ?? false
  const remaining_meals = parseOptionalInt(cell(col, "remaining_meals"), "remaining_meals")
  const notes = appendRestrictionLeftoversToNotes(cell(col, "notes") || null, restrictions.leftovers)
  const deliveryTime = cell(col, "delivery_time") || null

  const lat = parseOptionalCoord(cell(col, "latitude"), "latitude")
  const lng = parseOptionalCoord(cell(col, "longitude"), "longitude")
  if ((lat === undefined) !== (lng === undefined)) {
    throw new Error("latitude and longitude must be provided together")
  }
  const location = lat !== undefined && lng !== undefined ? { lat, lng } : null

  return {
    planId: catalog.id,
    planName: catalog.name,
    planType: catalog.type,
    durationDays: catalog.durationDays,
    name,
    email: emailRaw || null,
    mobile_number: `+971${local}`,
    address,
    mode,
    restrictionIds: restrictions.restrictions,
    restrictionNames: restrictions.restrictionNames,
    restrictedCategories: restrictions.restrictedCategories,
    mealsPerDay,
    breakfast,
    drinks,
    cakes,
    includedMeals,
    days: onCall ? [] : days,
    slots: resolvedSlots,
    onCall,
    started_at,
    expires_at,
    total_cents,
    paid_cents,
    payment_method,
    payment_reference: cell(col, "payment_reference") || null,
    paymentStatus,
    notes,
    paused,
    remaining_meals,
    deliveryTime,
    location,
  }
}

export function subscriptionDetailsFromCsvRow(row: ParsedSubscriptionCsvRow): Record<string, unknown> {
  const details: Record<string, unknown> = {
    source: "csv_import",
    planId: row.planId,
    planName: row.planName,
    planType: row.planType,
    durationDays: row.durationDays,
    name: row.name,
    email: row.email,
    mobile_number: row.mobile_number,
    address: row.address,
    location: row.location,
    mode: row.mode,
    restrictions: row.restrictionIds,
    restrictionNames: row.restrictionNames,
    restrictedCategories: row.restrictedCategories,
    mealsPerDay: row.mealsPerDay,
    breakfast: row.breakfast,
    drinks: row.drinks,
    cakes: row.cakes,
    includedMeals: row.mode === "flexible" ? row.includedMeals : [],
    days: row.onCall ? [] : row.days,
    slots: row.onCall ? [] : row.slots,
    onCall: row.onCall,
    paymentStatus: row.paymentStatus,
  }
  if (row.total_cents !== undefined) details.total_cents = row.total_cents
  if (row.notes) details.notes = row.notes
  if (row.deliveryTime) details.deliveryTime = row.deliveryTime
  return details
}
