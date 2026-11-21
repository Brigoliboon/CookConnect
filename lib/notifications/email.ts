import "server-only"
import nodemailer from "nodemailer"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceClient } from "@/lib/supabase/service"
import type { OrderWithItems } from "@/lib/supabase/tables/orders"
import type { SubscriptionInquiry } from "@/lib/supabase/tables/subscription_inquiries"
import type { RoleTarget } from "./types"

// Staff who receive email notifications: the same role that gets in-app and
// push notifications for new orders, limited to active accounts that opted in.
const EMAIL_ROLES: RoleTarget[] = ["employee"]

interface EmailMessage {
  subject: string
  text: string
}

function gmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

function formatTotal(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency}`
}

export async function getEmailRecipients(requestClient: SupabaseClient): Promise<string[]> {
  const privileged = createServiceClient() ?? requestClient
  const { data, error } = await privileged
    .from("accounts")
    .select("email")
    .in("role", EMAIL_ROLES)
    .eq("is_active", true)
    .eq("email_notifications", true)
  if (error) throw error
  const emails = (data ?? [])
    .map((row) => (row as { email?: string | null }).email?.trim())
    .filter((email): email is string => Boolean(email))
  return [...new Set(emails)]
}

async function sendToOptedInStaff(requestClient: SupabaseClient, message: EmailMessage): Promise<void> {
  if (!gmailConfigured()) {
    console.warn("[email] GMAIL_USER or GMAIL_APP_PASSWORD missing, skipping email")
    return
  }
  let recipients: string[]
  try {
    recipients = await getEmailRecipients(requestClient)
  } catch (err) {
    console.error("[email] recipient lookup failed:", err)
    return
  }
  if (recipients.length === 0) return

  const user = process.env.GMAIL_USER!
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "Cook Connect"
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD! },
  })
  try {
    // Recipients go in Bcc so staff don't see each other's addresses.
    await transporter.sendMail({
      from: { name: fromName, address: user },
      to: { name: fromName, address: user },
      bcc: recipients,
      subject: message.subject,
      text: message.text,
    })
  } catch (err) {
    console.error("[email] send failed:", err)
  }
}

export function buildOrderCreatedEmail(order: OrderWithItems, baseUrl: string): EmailMessage {
  const items = order.items.map((item) => {
    const addons = item.addons?.map((a) => a.name).filter(Boolean) ?? []
    return `- ${item.qty} x ${item.name}${addons.length ? ` (+ ${addons.join(", ")})` : ""}`
  })
  const lines = [
    `New order from ${order.name} (${order.origin}).`,
    "",
    `Status: ${order.status.replaceAll("_", " ")}`,
    `Mobile: ${order.mobile_number || "-"}`,
    `Address: ${order.address || "-"}`,
    "",
    "Items:",
    ...items,
    "",
    `Subtotal: ${formatTotal(order.subtotal_cents, order.currency)}`,
    `Delivery: ${formatTotal(order.shipping_cents, order.currency)}`,
    `Total: ${formatTotal(order.subtotal_cents + order.shipping_cents, order.currency)}`,
    "",
    `Open orders: ${baseUrl}/employee/orders`,
  ]
  return { subject: `New order: ${order.name}`, text: lines.join("\n") }
}

export function buildSubscriptionInquiryEmail(
  inquiry: SubscriptionInquiry,
  planName: string | null,
  baseUrl: string,
): EmailMessage {
  const details = inquiry.details ?? {}
  const mealsPerDay = typeof details.mealsPerDay === "number" ? details.mealsPerDay : null
  const days = Array.isArray(details.days) ? (details.days as string[]) : []
  const lines = [
    `New subscription inquiry from ${inquiry.name}.`,
    "",
    `Plan: ${planName ?? inquiry.plan_id}`,
    ...(mealsPerDay !== null ? [`Meals per day: ${mealsPerDay}`] : []),
    ...(days.length ? [`Days: ${days.join(", ")}`] : []),
    `Mobile: ${inquiry.mobile_number}`,
    ...(inquiry.email ? [`Email: ${inquiry.email}`] : []),
    `Address: ${inquiry.address}`,
    "",
    `Open subscriptions: ${baseUrl}/employee/subscriptions`,
  ]
  return { subject: `New subscription inquiry: ${inquiry.name}`, text: lines.join("\n") }
}

export async function emailOrderCreated(
  client: SupabaseClient,
  order: OrderWithItems,
  baseUrl: string,
): Promise<void> {
  await sendToOptedInStaff(client, buildOrderCreatedEmail(order, baseUrl))
}

export async function emailSubscriptionInquiryCreated(
  client: SupabaseClient,
  inquiry: SubscriptionInquiry,
  baseUrl: string,
): Promise<void> {
  let planName: string | null = null
  try {
    const privileged = createServiceClient() ?? client
    const { data } = await privileged
      .from("subscription_plans")
      .select("name")
      .eq("id", inquiry.plan_id)
      .maybeSingle()
    planName = (data as { name?: string } | null)?.name ?? null
  } catch (err) {
    console.error("[email] plan lookup failed:", err)
  }
  await sendToOptedInStaff(client, buildSubscriptionInquiryEmail(inquiry, planName, baseUrl))
}
