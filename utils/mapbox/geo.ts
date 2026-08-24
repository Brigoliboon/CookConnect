export interface DeliveryArea {
  area: string | null
  supported: boolean
  feeCents: number
}

const DELIVERY_FEES: Record<string, number> = {
  ajman: 0,
}

const NORMALIZED_FEES: [string, number][] = Object.entries(DELIVERY_FEES).map(([k, v]) => [
  k.replace(/[^a-z]/g, ""),
  v,
])

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "")
}

function detectArea(...texts: string[]): DeliveryArea {
  const normalized = normalize(texts.join(" "))
  for (const [key, cents] of NORMALIZED_FEES) {
    if (normalized.includes(key)) {
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
  return { address, area: detectArea(...texts) }
}

export function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2)} AED`
}