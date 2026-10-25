import { createHmac, timingSafeEqual } from "node:crypto"

export interface SubscriptionInviteResult {
  valid: boolean
  plan?: string
  expiresAt?: string
  error?: string
}

interface InvitePayload {
  plan: string
  exp: number
}

const DEFAULT_EXPIRY_DAYS = 14
const MAX_EXPIRY_DAYS = 365

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
): { token: string; expiresAt: string } {
  const secret = getSecret()
  if (!secret) throw new Error("Subscription invite secret is not configured")

  const days = Math.min(MAX_EXPIRY_DAYS, Math.max(1, Math.round(expiresInDays)))
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const payload = encodePayload({ plan, exp: Math.floor(expiresAt.getTime() / 1000) })
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

  return {
    valid: true,
    plan: decoded.plan,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
  }
}
