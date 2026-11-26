// Contact form (FR-51): validation and email text. Pure, so it can be checked without a mail server.

export const CONTACT_LIMITS = { name: 100, email: 254, message: 2000 } as const

export interface ContactMessage {
  name: string
  email: string
  message: string
}

export type ParsedContact =
  | { ok: true; value: ContactMessage }
  | { ok: false; error: string }

const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]{2,}$/

// Header values must never carry line breaks (header injection).
function oneLine(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim()
}

export function parseContactMessage(body: unknown): ParsedContact {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request" }
  const raw = body as Record<string, unknown>
  const name = typeof raw.name === "string" ? oneLine(raw.name) : ""
  const email = typeof raw.email === "string" ? raw.email.trim() : ""
  const message = typeof raw.message === "string" ? raw.message.replace(/\r\n/g, "\n").trim() : ""

  if (!name || !email || !message) return { ok: false, error: "Name, email and message are required" }
  if (name.length > CONTACT_LIMITS.name) return { ok: false, error: "Name is too long" }
  if (email.length > CONTACT_LIMITS.email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address" }
  }
  if (message.length > CONTACT_LIMITS.message) return { ok: false, error: "Message is too long" }
  return { ok: true, value: { name, email, message } }
}

export function buildContactEmail(contact: ContactMessage) {
  return {
    subject: `Website message from ${contact.name}`,
    text: [
      "New message from the website contact form.",
      "",
      `Name: ${contact.name}`,
      `Email: ${contact.email}`,
      "",
      contact.message,
      "",
      "Reply to this email to answer them directly.",
    ].join("\n"),
  }
}
