import { allowContactRequest } from "@/lib/contact/rate-limit"
import { parseContactMessage } from "@/lib/contact/message"
import { ContactNotConfiguredError, sendContactEmail } from "@/lib/notifications/email"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Hidden "website" field: people never see it, bots fill it. Pretend it worked and send nothing.
  if (body && typeof body === "object" && (body as Record<string, unknown>).website) {
    return Response.json({ ok: true })
  }

  const parsed = parseContactMessage(body)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (!allowContactRequest(ip)) {
    return Response.json({ error: "Too many messages. Please try again in a few minutes." }, { status: 429 })
  }

  try {
    await sendContactEmail(parsed.value)
    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof ContactNotConfiguredError) {
      console.warn("[API] POST /api/contact: GMAIL_USER or GMAIL_APP_PASSWORD missing")
      return Response.json({ error: "Messaging is unavailable right now" }, { status: 503 })
    }
    console.error("[API] POST /api/contact send failed:", err)
    return Response.json({ error: "Could not send your message" }, { status: 502 })
  }
}
