const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

function toBase64(bytes: string): string {
  return btoa(bytes)
}

function fromBase64(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
  return atob(padded)
}

/** Encode recipe UUIDs into a URL-safe `ids` param value (base64 of JSON array). */
export function encodeRecipeIds(ids: string[]): string {
  return toBase64(JSON.stringify(ids.filter(isUuid)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

/** Decode an `ids` param value back into recipe UUIDs. Accepts base64url/base64 of a JSON array or comma-separated list, plus plain comma-separated UUIDs. */
export function decodeRecipeIds(param: string | null): string[] {
  if (!param) return []
  const candidates: string[] = []
  try {
    const decoded = fromBase64(param.trim())
    try {
      const parsed: unknown = JSON.parse(decoded)
      if (Array.isArray(parsed)) candidates.push(...parsed.filter((v): v is string => typeof v === "string"))
      else candidates.push(decoded)
    } catch {
      candidates.push(...decoded.split(","))
    }
  } catch {
    candidates.push(...param.split(","))
  }
  const seen = new Set<string>()
  for (const raw of candidates) {
    const id = raw.trim()
    if (isUuid(id)) seen.add(id)
  }
  return [...seen]
}
