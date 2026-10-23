#!/usr/bin/env node
/**
 * Generates small WebP thumbnails for the FeaturedMeals category nav.
 *
 * The source art is 1000-2000px PNG/SVG files (the *_model.svg files are
 * raster-in-SVG wrappers with embedded base64 images, not real vectors) but the
 * nav renders them at 32px. Generating static thumbnails keeps the icons off
 * the Next.js image optimizer, which is metered on the Vercel Hobby plan.
 *
 * Usage:
 *   node --env-file=.env.local tools/optimize-category-icons.mjs
 *   node --env-file=.env.local tools/optimize-category-icons.mjs --dry-run
 *   node --env-file=.env.local tools/optimize-category-icons.mjs --force
 *   node --env-file=.env.local tools/optimize-category-icons.mjs --quiet
 */

import { mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const OUTPUT_DIR = path.join(process.cwd(), "public", "menu-icons")
const WIDTH = 128
const HEIGHT = 128

/** Must stay in sync with `categories` in components/landing/FeaturedMeals.tsx */
const CATEGORIES = [
  { id: "meals", src: "public/menus/beef-steak.png" },
  { id: "salad", src: "public/menus/salad.png" },
  { id: "rice-sides", src: "public/icons/ricensides_model.svg" },
  { id: "platters", src: "public/icons/platters_model.svg" },
  { id: "pasta", src: "public/icons/pasta_model.svg" },
  { id: "wraps", src: "public/icons/wraps_model.svg" },
  { id: "pizza", src: "public/icons/pizza_model.svg" },
  { id: "burgers", src: "public/icons/burgernfries_model.svg" },
  { id: "desserts", src: "public/icons/dessert_model.svg" },
  { id: "drinks", src: "public/drink_sample.svg" },
]

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const force = args.includes("--force")
const quiet = args.includes("--quiet")

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

async function sizeOf(file) {
  try {
    return (await stat(file)).size
  } catch {
    return null
  }
}

async function main() {
  const output = []
  let sourceTotal = 0
  let resultTotal = 0

  for (const { id, src } of CATEGORIES) {
    const outFile = path.join(OUTPUT_DIR, `${id}.webp`)
    const existing = await sizeOf(outFile)

    const sourceBytes = await sizeOf(src)
    if (sourceBytes === null) {
      console.error(`✗ ${id}: missing source ${src}`)
      process.exitCode = 1
      continue
    }
    sourceTotal += sourceBytes

    if (existing !== null && !force) {
      resultTotal += existing
      if (!quiet) console.log(`· ${id} (${formatBytes(sourceBytes)}) → exists ${formatBytes(existing)}`)
      output.push({ id, src, out: outFile, sourceBytes, resultBytes: existing })
      continue
    }

    if (dryRun) {
      console.log(`[dry-run] ${id}: ${src} (${formatBytes(sourceBytes)}) → ${outFile}`)
      continue
    }

    const buffer = await sharp(src)
      .rotate()
      .resize({ width: WIDTH, height: HEIGHT, fit: "cover", withoutEnlargement: false })
      .webp({ quality: qualityForWidth(WIDTH) })
      .toBuffer()

    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(outFile, buffer)
    resultTotal += buffer.length

    if (!quiet) {
      console.log(`✓ ${id} (${formatBytes(sourceBytes)}) → ${formatBytes(buffer.length)}`)
    }
    output.push({ id, src, out: outFile, sourceBytes, resultBytes: buffer.length })
  }

  if (dryRun) {
    console.log("\nNo files written (dry-run). Re-run without --dry-run.")
    return
  }

  console.log(`\n${output.length} icons in ${path.relative(process.cwd(), OUTPUT_DIR)}/`)
  console.log(`source=${formatBytes(sourceTotal)} result=${formatBytes(resultTotal)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
