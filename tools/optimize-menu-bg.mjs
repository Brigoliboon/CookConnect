#!/usr/bin/env node
/**
 * Generates static WebP assets for the /menu catalog backdrop.
 *
 * MenuClient.tsx renders these through plain <img srcSet> instead of next/image
 * so the backdrop never spends the metered Vercel Image Optimization budget, and
 * the 1.0MB menu-bg.jpeg source is reduced before it ever reaches the browser.
 *
 * Usage:
 *   node tools/optimize-menu-bg.mjs
 *   node tools/optimize-menu-bg.mjs --dry-run
 *   node tools/optimize-menu-bg.mjs --force
 *   node tools/optimize-menu-bg.mjs --quiet
 */

import { mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const OUTPUT_DIR = path.join(process.cwd(), "public", "menu-bg")

/**
 * Must stay in sync with the <img srcSet> widths in app/[locale]/menu/MenuClient.tsx.
 *
 * menu-bg.jpeg is 1376x768 and is pinned to the viewport as a full-bleed
 * backdrop, so nothing wider than the source is ever generated. The burlap
 * weave is high-frequency noise; q60 is the sweet spot before WebP starts
 * smearing the fabric texture.
 */
const IMAGES = [
  { id: "menu-bg", src: "public/menu-bg.jpeg", widths: [640, 1000, 1376], quality: 60 },
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

async function sizeOf(file) {
  try {
    return (await stat(file)).size
  } catch {
    return null
  }
}

async function main() {
  let sourceTotal = 0
  let resultTotal = 0

  for (const { id, src, widths, quality } of IMAGES) {
    const sourceBytes = await sizeOf(src)
    if (sourceBytes === null) {
      console.error(`✗ ${id}: missing source ${src}`)
      process.exitCode = 1
      continue
    }
    sourceTotal += sourceBytes

    const metadata = await sharp(src).metadata()
    const alpha = metadata.hasAlpha ? " alpha" : ""
    if (!quiet) {
      console.log(`\n${id}: ${src} ${metadata.width}x${metadata.height} ${formatBytes(sourceBytes)}${alpha}`)
    }

    for (const width of widths) {
      const outFile = path.join(OUTPUT_DIR, `${id}-${width}.webp`)
      const existing = await sizeOf(outFile)

      if (existing !== null && !force) {
        resultTotal += existing
        if (!quiet) console.log(`  · ${width}w exists ${formatBytes(existing)}`)
        continue
      }

      if (dryRun) {
        console.log(`  [dry-run] ${width}w -> ${outFile}`)
        continue
      }

      const buffer = await sharp(src)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer()

      await mkdir(OUTPUT_DIR, { recursive: true })
      await writeFile(outFile, buffer)
      resultTotal += buffer.length
      if (!quiet) console.log(`  ✓ ${width}w ${formatBytes(buffer.length)}`)
    }
  }

  if (dryRun) {
    console.log("\nNo files written (dry-run). Re-run without --dry-run.")
    return
  }

  console.log(`\nAssets in ${path.relative(process.cwd(), OUTPUT_DIR)}/`)
  console.log(`source=${formatBytes(sourceTotal)} generated=${formatBytes(resultTotal)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
