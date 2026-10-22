import sharp from "sharp"

const BUCKET = process.env.MEAL_BUCKET ?? "meal"
const CACHE_CONTROL = "31536000"
const VARIANT_WIDTHS = [128, 600, 1200]

function qualityForWidth(width: number) {
  if (width <= 160) return 70
  if (width <= 800) return 75
  return 78
}

export async function uploadImage(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const base = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const input = Buffer.from(await file.arrayBuffer())
  const metadata = await sharp(input).metadata()
  const sourceWidth = metadata.width ?? Math.max(...VARIANT_WIDTHS)

  const variants = new Map<number, Buffer>()
  for (const target of VARIANT_WIDTHS) {
    const width = Math.min(target, sourceWidth)
    if (variants.has(width)) continue

    const buffer = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: qualityForWidth(width), effort: 4 })
      .toBuffer()

    variants.set(width, buffer)
  }

  const largestWidth = [...variants.keys()].sort((a, b) => a - b).at(-1) ?? sourceWidth
  const uploads = [
    { path: `${base}.${ext}`, body: input, contentType: file.type || "application/octet-stream" },
    ...[...variants.entries()].map(([width, buffer]) => ({
      path: `${base}-${width}.webp`,
      body: buffer,
      contentType: "image/webp",
    })),
  ]

  for (const upload of uploads) {
    const { error } = await supabase.storage.from(BUCKET).upload(upload.path, upload.body, {
      contentType: upload.contentType,
      cacheControl: CACHE_CONTROL,
      upsert: false,
    })

    if (error) throw error
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${base}-${largestWidth}.webp`)
  return urlData.publicUrl
}
