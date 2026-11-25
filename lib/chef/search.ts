/** Lowercase, strip accents, collapse spaces. */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * True when every word typed appears somewhere in the given fields, so "ali kh" finds "Ali Khan".
 * An empty query matches everything.
 */
export function matchesSearch(query: string, fields: ReadonlyArray<string | null | undefined>): boolean {
  const words = normalizeSearch(query).split(" ").filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalizeSearch(fields.filter(Boolean).join(" "))
  return words.every((w) => haystack.includes(w))
}
