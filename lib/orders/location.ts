export function parseOrderLocation(location: unknown): { lat: number; lng: number } | null {
  if (!location) return null
  if (typeof location === "object") {
    const o = location as { lat?: number; lng?: number; coordinates?: [number, number] }
    if (typeof o.lat === "number" && typeof o.lng === "number") return { lat: o.lat, lng: o.lng }
    if (Array.isArray(o.coordinates)) return { lng: o.coordinates[0], lat: o.coordinates[1] }
    return null
  }
  if (typeof location !== "string") return null
  try {
    const bytes = new Uint8Array(location.match(/../g)!.map((b) => parseInt(b, 16)))
    const view = new DataView(bytes.buffer)
    const offset = bytes.length - 16
    return { lng: view.getFloat64(offset, true), lat: view.getFloat64(offset + 8, true) }
  } catch {
    return null
  }
}
