import { createHash } from "node:crypto"

export const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300, stale-if-error=600",
}

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

export function matchesEtag(value: string | null, etag: string): boolean {
  if (!value) return false
  return value.split(",").some((candidate) => {
    const tag = candidate.trim()
    return tag === "*" || tag.replace(/^W\//, "") === etag
  })
}

export function etaggedJson(request: Request, payload: unknown): Response {
  const body = JSON.stringify(payload)
  const etag = `"${createHash("sha1").update(body).digest("hex")}"`

  if (matchesEtag(request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers: { ...CACHE_HEADERS, ETag: etag } })
  }

  return new Response(body, {
    headers: {
      ...CACHE_HEADERS,
      "Content-Type": "application/json",
      ETag: etag,
    },
  })
}
