const VARIANT_RE = /-(\d+)\.webp$/
const KNOWN_WIDTHS = [128, 600, 1200]

export function imageThumb(url: string): string {
  return VARIANT_RE.test(url) ? url.replace(VARIANT_RE, "-128.webp") : url
}

export function imageWidth(url: string): number | undefined {
  const match = url.match(VARIANT_RE)
  return match ? Number(match[1]) : undefined
}

export function imageWidths(url: string): number[] {
  const canonical = imageWidth(url)
  if (!canonical) return []

  return [...new Set([128, ...KNOWN_WIDTHS.slice(1), canonical])]
    .filter((width) => width > 0 && width <= canonical)
    .sort((a, b) => a - b)
}

export function imageVariant(url: string, targetWidth: number): string {
  const widths = imageWidths(url)
  if (widths.length === 0) return url

  const width = widths.find((available) => available >= targetWidth) ?? widths[widths.length - 1]
  return url.replace(VARIANT_RE, `-${width}.webp`)
}

export function imageSrcSet(url: string, widths?: number[]): string | undefined {
  const available = imageWidths(url)
  if (available.length === 0) return undefined

  const requested = widths ?? available
  const selected = [
    ...new Set(
      requested.map(
        (target) => available.find((width) => width >= target) ?? available[available.length - 1],
      ),
    ),
  ].sort((a, b) => a - b)

  return selected.map((width) => `${url.replace(VARIANT_RE, `-${width}.webp`)} ${width}w`).join(", ")
}
