export interface DeliveryArea {
  area: string | null
  supported: boolean
  feeCents: number
}

const DELIVERY_FEES: Record<string, number> = {
  ajman: 0,
}

export const SUBSCRIPTION_DELIVERY_FEES: Record<string, number> = {
  ajman: 0,
  sharjah: 10000,
  dubai: 20000,
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "")
}

function detectArea(fees: Record<string, number>, ...texts: string[]): DeliveryArea {
  const normalized = normalize(texts.join(" "))
  for (const [key, cents] of Object.entries(fees)) {
    const normalizedKey = normalize(key)
    if (normalized.includes(normalizedKey)) {
      return { area: key, supported: true, feeCents: cents }
    }
  }
  return { area: null, supported: false, feeCents: 0 }
}

export interface ResolvedAddress {
  address: string
  area: DeliveryArea
}

interface GeoFeature {
  place_name?: string
  text?: string
  context?: { text?: string; short_code?: string }[]
}

export async function resolveDeliveryAddress(
  lat: number,
  lng: number,
  fees: Record<string, number> = DELIVERY_FEES,
): Promise<ResolvedAddress> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`,
  )
  if (!res.ok) throw new Error("Unable to resolve delivery address")
  const data = await res.json()
  const place: GeoFeature | undefined = data?.features?.[0]

  const address = place?.place_name ?? ""
  const texts = [place?.place_name ?? "", place?.text ?? ""]
  for (const ctx of place?.context ?? []) {
    if (ctx.text) texts.push(ctx.text)
  }
  return { address, area: detectArea(fees, ...texts) }
}

export function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2)} AED`
}