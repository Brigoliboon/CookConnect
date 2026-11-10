#!/usr/bin/env node
/**
 * Generates static WebP assets for the landing hero.
 *
 * Hero.tsx renders these through plain <img srcSet> instead of next/image so
 * the hero never spends the metered Vercel Image Optimization budget, and the
 * 4.9MB hero-menu.png source is reduced before it ever reaches the browser.
 *
 * Usage:
 *   node tools/optimize-hero-images.mjs
 *   node tools/optimize-hero-images.mjs --dry-run
 *   node tools/optimize-hero-images.mjs --force
 *   node tools/optimize-hero-images.mjs --quiet
 */

import { mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const OUTPUT_DIR = path.join(process.cwd(), "public", "hero")

/**
 * Must stay in sync with the <img srcSet> widths in components/landing/Hero.tsx.
 *
 * bg.jpg is decorative (40% opacity behind a gradient) and its source is only
 * 1000px wide, so nothing wider than the source is ever generated.
 * hero-menu.png is the desktop hero visual, hidden below the `sm` breakpoint;
 * 64w keeps the hidden mobile request as cheap as it is today.
 */
const IMAGES = [
  // q65: sits at 40% opacity behind a black gradient, so artefacts are invisible.
  { id: "bg", src: "public/bg.jpg", widths: [640, 1000], quality: 65 },
  // q70: the visible desktop hero visual, kept as high as WebP can go before it
  // stops beating AVIF for this source.
  { id: "hero-menu", src: "public/hero-menu.png", widths: [64, 560, 1120], quality: 70 },
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
