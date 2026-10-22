#!/usr/bin/env node
/**
 * Generates optimized WebP variants for every image in the Supabase meal bucket.
 *
 * Supabase Storage does not resize images on the free plan, so this script
 * downloads each original, resizes it with sharp, and uploads new .webp objects
 * next to it. Originals are never modified or deleted.
 *
 * Usage:
 *   node --env-file=.env.local tools/optimize-meal-images.mjs
 *   node --env-file=.env.local tools/optimize-meal-images.mjs --dry-run
 *   node --env-file=.env.local tools/optimize-meal-images.mjs --force
 *   node --env-file=.env.local tools/optimize-meal-images.mjs --only=1786480163670-6hh9xtt2oaa.png
 *   node --env-file=.env.local tools/optimize-meal-images.mjs --limit=5
 *   node --env-file=.env.local tools/optimize-meal-images.mjs --quiet
 */

import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.MEAL_BUCKET ?? "meal"

const CACHE_CONTROL = "31536000"
const REQUESTED_WIDTHS = [128, 600, 1200]
const CONCURRENCY = Number(process.env.IMAGE_CONCURRENCY ?? 8)
const IMAGE_RE = /\.(png|jpe?g|webp|avif)$/i
const VARIANT_RE = /-\d+\.webp$/i

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const force = args.includes("--force")
const quiet = args.includes("--quiet")
const only = args.find((arg) => arg.startsWith("--only="))?.slice("--only=".length)
const limit = Number(args.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length) ?? Number.POSITIVE_INFINITY)

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  console.error("Run with: node --env-file=.env.local tools/optimize-meal-images.mjs")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function qualityForWidth(width) {
  if (width <= 160) return 70
  if (width <= 800) return 75
  return 78
}

async function listAll(prefix = "") {
  const entries = []
  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) throw error

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      const isFolder = entry.id === null || entry.metadata === null

      if (isFolder) {
        entries.push(...(await listAll(path)))
      } else if (!entry.name.startsWith(".")) {
        entries.push({ ...entry, path })
      }
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return entries
}

async function mapLimit(items, limit, fn) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      await fn(items[index])
    }
  })
  await Promise.all(workers)
}

async function processImage(entry, existingPaths) {
  const base = entry.path.replace(/\.[^./]+$/, "")

  if (VARIANT_RE.test(entry.path)) return { generated: 0, skipped: 1, saved: 0 }
  if (!IMAGE_RE.test(entry.path)) return { generated: 0, skipped: 0, saved: 0 }
  if (only && entry.path !== only) return { generated: 0, skipped: 0, saved: 0 }

  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(entry.path)
  if (downloadError) throw new Error(`download ${entry.path}: ${downloadError.message}`)

  const input = Buffer.from(await blob.arrayBuffer())
  const metadata = await sharp(input).metadata()
  const sourceWidth = metadata.width ?? Infinity

  const widths = [
    ...new Set(
      REQUESTED_WIDTHS.map((width) => Math.min(width, sourceWidth)).filter(
        (width) => Number.isFinite(width) && width > 0,
      ),
    ),
  ].sort((a, b) => a - b)

  const originalSize = Number(entry.metadata?.size ?? input.length)
  const outputs = []

  for (const width of widths) {
    const outputPath = `${base}-${width}.webp`
    if (existingPaths.has(outputPath) && !force) continue

    const buffer = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: qualityForWidth(width), effort: 4 })
      .toBuffer()

    outputs.push({ path: outputPath, buffer })
  }

  if (dryRun) {
    if (!quiet) {
      console.log(
        `[dry-run] ${entry.path} (${formatBytes(originalSize)}) → ${outputs
          .map((output) => `${output.path.split("/").pop()} ${formatBytes(output.buffer.length)}`)
          .join(", ")}`,
      )
    }
    return {
      generated: 0,
      skipped: widths.length - outputs.length,
      saved: outputs.reduce((sum, output) => sum + output.buffer.length, 0),
    }
  }

  let generated = 0
  for (const output of outputs) {
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(output.path, output.buffer, {
      contentType: "image/webp",
      cacheControl: CACHE_CONTROL,
      upsert: force,
    })

    if (uploadError) {
      if (!force && /already exists|duplicate/i.test(uploadError.message)) continue
      throw new Error(`upload ${output.path}: ${uploadError.message}`)
    }

    existingPaths.add(output.path)
    generated += 1
  }

  const saved = outputs.reduce((sum, output) => sum + output.buffer.length, 0)
  const totalOutput = outputs.length > 0 ? outputs.map((output) => formatBytes(output.buffer.length)).join(", ") : "nothing new"
  if (!quiet) console.log(`✓ ${entry.path} (${formatBytes(originalSize)}) → ${totalOutput}`)

  return { generated, skipped: widths.length - outputs.length, saved }
}

async function main() {
  console.log(`Bucket: ${BUCKET}`)
  console.log(`Variants: ${REQUESTED_WIDTHS.join(", ")}px WebP`)
  console.log(`Mode: ${dryRun ? "dry-run" : "upload"}${force ? ", force" : ""}`)

  const entries = await listAll()
  const existingPaths = new Set(entries.map((entry) => entry.path))
  const images = entries
    .filter((entry) => entry.id !== null && IMAGE_RE.test(entry.path) && !VARIANT_RE.test(entry.path))
    .slice(0, limit)

  if (only && !existingPaths.has(only)) {
    console.error(`Object not found in bucket: ${only}`)
    process.exit(1)
  }

  console.log(`Found ${images.length} source images (concurrency ${CONCURRENCY}).\n`)

  let generated = 0
  let skipped = 0
  let saved = 0
  let failed = 0
  let completed = 0

  await mapLimit(images, CONCURRENCY, async (entry) => {
    try {
      const result = await processImage(entry, existingPaths)
      generated += result.generated
      skipped += result.skipped
      saved += result.saved
    } catch (error) {
      failed += 1
      console.error(`✗ ${entry.path}: ${error instanceof Error ? error.message : error}`)
    } finally {
      completed += 1
      if (quiet && completed % 25 === 0) {
        console.log(`... ${completed}/${images.length} processed (${generated} files generated, ${failed} failed)`)
      }
    }
  })

  console.log(`\nDone. generated=${generated} skipped=${skipped} failed=${failed} output=${formatBytes(saved)}`)
  if (dryRun) console.log("No files were uploaded (dry-run).")
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
