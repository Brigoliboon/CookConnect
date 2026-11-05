import { createHmac, timingSafeEqual } from "node:crypto"

export type SubscriptionInviteSlot = "morning" | "noon" | "evening"

export interface SubscriptionInvitePreferences {
  mode?: "normal" | "flexible"
  restrictions?: string[]
  restrictionNames?: Record<string, string>
  breakfast?: boolean
  includedMeals?: string[]
  days?: string[]
  slots?: SubscriptionInviteSlot[]
  onCall?: boolean
}

export interface SubscriptionInviteResult {
  valid: boolean
  plan?: string
  expiresAt?: string
  agreedPriceCents?: number
  basePriceCents?: number
  concession?: string
  currency?: string
  mealsPerDay?: number
  preferences?: SubscriptionInvitePreferences
  error?: string
}

export interface SubscriptionInviteOptions {
  agreedPriceCents?: number | null
  basePriceCents?: number | null
  concession?: string | null
  currency?: string | null
  mealsPerDay?: number | null
  preferences?: SubscriptionInvitePreferences | null
}

interface InvitePayload {
  plan: string
  exp: number
  agreed_price_cents?: number
  base_price_cents?: number
  concession?: string
  currency?: string
  meals_per_day?: number
  preferences?: SubscriptionInvitePreferences
}

const DEFAULT_EXPIRY_DAYS = 14
const MAX_EXPIRY_DAYS = 365
const DEFAULT_CURRENCY = "AED"
const MIN_MEALS_PER_DAY = 1
const MAX_MEALS_PER_DAY = 5
const MAX_PREFERENCE_ITEMS = 100
const MAX_PREFERENCE_STRING = 200

function optionalCents(value: number | null | undefined, label: string): number | undefined {
  if (value === null || value === undefined) return undefined
  const amount = Number(value)
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`${label} must be a positive integer number of cents`)
  }
  return amount
}

function optionalMealsPerDay(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const meals = Number(value)
  if (!Number.isInteger(meals) || meals < MIN_MEALS_PER_DAY || meals > MAX_MEALS_PER_DAY) {
    throw new Error(`mealsPerDay must be an integer between ${MIN_MEALS_PER_DAY} and ${MAX_MEALS_PER_DAY}`)
  }
  return meals
}

function optionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.length > MAX_PREFERENCE_ITEMS) {
    throw new Error(`${label} must contain at most ${MAX_PREFERENCE_ITEMS} items`)
  }
  return value.map((item) => {
    if (typeof item !== "string" || !item.trim() || item.length > MAX_PREFERENCE_STRING) {
      throw new Error(`${label} contains an invalid value`)
    }
    return item.trim()
  })
}

function optionalStringMap(value: unknown, label: string): Record<string, string> | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > MAX_PREFERENCE_ITEMS) {
    throw new Error(`${label} must contain at most ${MAX_PREFERENCE_ITEMS} items`)
  }
  const result: Record<string, string> = {}
  for (const [key, item] of entries) {
    if (
      !key ||
      key.length > MAX_PREFERENCE_STRING ||
      typeof item !== "string" ||
      !item.trim() ||
      item.length > MAX_PREFERENCE_STRING
    ) {
      throw new Error(`${label} contains an invalid value`)
    }
    result[key] = item.trim()
  }
  return Object.keys(result).length ? result : undefined
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean`)
  return value
}

function optionalMode(value: unknown): "normal" | "flexible" | undefined {
  if (value === undefined || value === null) return undefined
  if (value === "normal" || value === "flexible") return value
  throw new Error("preferences.mode must be normal or flexible")
}

function optionalPreferences(value: unknown): SubscriptionInvitePreferences | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("preferences must be an object")
  }

  const input = value as Record<string, unknown>
  const mode = optionalMode(input.mode)
  const restrictions = optionalStringArray(input.restrictions, "preferences.restrictions")
  const restrictionNames = optionalStringMap(input.restrictionNames, "preferences.restrictionNames")
  const breakfast = optionalBoolean(input.breakfast, "preferences.breakfast")
  const includedMeals = optionalStringArray(input.includedMeals, "preferences.includedMeals")
  const days = optionalStringArray(input.days, "preferences.days")
  const slots = optionalStringArray(input.slots, "preferences.slots")
  if (slots?.some((slot) => slot !== "morning" && slot !== "noon" && slot !== "evening")) {
    throw new Error("preferences.slots contains an invalid value")
  }
  const onCall = optionalBoolean(input.onCall, "preferences.onCall")

  const preferences: SubscriptionInvitePreferences = {
    ...(mode ? { mode } : {}),
    ...(restrictions ? { restrictions } : {}),
    ...(restrictionNames ? { restrictionNames } : {}),
    ...(breakfast !== undefined ? { breakfast } : {}),
    ...(includedMeals ? { includedMeals } : {}),
    ...(days ? { days } : {}),
    ...(slots ? { slots: slots as SubscriptionInviteSlot[] } : {}),
    ...(onCall !== undefined ? { onCall } : {}),
  }

  return Object.keys(preferences).length ? preferences : undefined
}

function getSecret(): string | null {
  return process.env.SUBSCRIPTION_INVITE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function encodePayload(payload: InvitePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

export function createSubscriptionInviteToken(
  plan: string,
  expiresInDays = DEFAULT_EXPIRY_DAYS,
  options: SubscriptionInviteOptions = {},
): { token: string; expiresAt: string } {
  const secret = getSecret()
  if (!secret) throw new Error("Subscription invite secret is not configured")

  const agreedPriceCents = optionalCents(options.agreedPriceCents, "agreedPriceCents")
  const basePriceCents = optionalCents(options.basePriceCents, "basePriceCents")
  const mealsPerDay = optionalMealsPerDay(options.mealsPerDay)
  const preferences = optionalPreferences(options.preferences)

  const days = Math.min(MAX_EXPIRY_DAYS, Math.max(1, Math.round(expiresInDays)))
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const payload = encodePayload({
    plan,
    exp: Math.floor(expiresAt.getTime() / 1000),
    ...(agreedPriceCents !== undefined ? { agreed_price_cents: agreedPriceCents } : {}),
    ...(basePriceCents !== undefined ? { base_price_cents: basePriceCents } : {}),
    ...(options.concession ? { concession: String(options.concession) } : {}),
    ...(mealsPerDay !== undefined ? { meals_per_day: mealsPerDay } : {}),
    ...(preferences ? { preferences } : {}),
    ...(agreedPriceCents !== undefined || basePriceCents !== undefined
      ? { currency: options.currency?.trim() || DEFAULT_CURRENCY }
      : {}),
  })
  const token = `${payload}.${sign(payload, secret)}`

  return { token, expiresAt: expiresAt.toISOString() }
}

export function verifySubscriptionInviteToken(
  token: string | null | undefined,
  expectedPlan?: string | null,
): SubscriptionInviteResult {
  const secret = getSecret()
  if (!secret) return { valid: false, error: "Invitation validation is not configured" }
  if (!token?.trim()) return { valid: false, error: "Invitation token is missing" }

  const [payload, signature] = token.trim().split(".")
  if (!payload || !signature) return { valid: false, error: "Invitation token is malformed" }

  const expectedSignature = sign(payload, secret)
  const actual = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { valid: false, error: "Invitation token is invalid" }
  }

  let decoded: InvitePayload
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as InvitePayload
  } catch {
    return { valid: false, error: "Invitation token is malformed" }
  }

  if (!decoded?.plan || typeof decoded.exp !== "number") {
    return { valid: false, error: "Invitation token is malformed" }
  }

  if (decoded.exp * 1000 <= Date.now()) {
    return { valid: false, error: "This invitation link has expired" }
  }

  if (expectedPlan && decoded.plan !== expectedPlan) {
    return { valid: false, error: "This invitation is for a different plan" }
  }

  const agreedPriceCents = optionalPayloadCents(decoded.agreed_price_cents)
  const basePriceCents = optionalPayloadCents(decoded.base_price_cents)
  const mealsPerDay = optionalPayloadMealsPerDay(decoded.meals_per_day)
  if (agreedPriceCents === null || basePriceCents === null || mealsPerDay === null) {
    return { valid: false, error: "Invitation token is malformed" }
  }
  if (decoded.concession !== undefined && typeof decoded.concession !== "string") {
    return { valid: false, error: "Invitation token is malformed" }
  }
  if (decoded.currency !== undefined && typeof decoded.currency !== "string") {
    return { valid: false, error: "Invitation token is malformed" }
  }

  let preferences: SubscriptionInvitePreferences | undefined
  try {
    preferences = optionalPreferences(decoded.preferences)
  } catch {
    return { valid: false, error: "Invitation token is malformed" }
  }

  return {
    valid: true,
    plan: decoded.plan,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
    ...(agreedPriceCents !== undefined ? { agreedPriceCents } : {}),
    ...(basePriceCents !== undefined ? { basePriceCents } : {}),
    ...(decoded.concession ? { concession: decoded.concession } : {}),
    ...(decoded.currency ? { currency: decoded.currency } : {}),
    ...(mealsPerDay !== undefined ? { mealsPerDay } : {}),
    ...(preferences ? { preferences } : {}),
  }
}

function optionalPayloadCents(value: unknown): number | undefined | null {
  if (value === undefined) return undefined
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null
  return value
}

function optionalPayloadMealsPerDay(value: unknown): number | undefined | null {
  if (value === undefined) return undefined
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < MIN_MEALS_PER_DAY ||
    value > MAX_MEALS_PER_DAY
  ) {
    return null
  }
  return value
}
