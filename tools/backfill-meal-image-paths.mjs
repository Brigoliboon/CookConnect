#!/usr/bin/env node
/**
 * Rewrites recipes.image_path from original image URLs to generated WebP variants.
 *
 * The variant migration uploads files next to the originals but does not update
 * the database, so existing meals keep serving the original PNG/JPG. This script
 * builds the variant map from storage and updates each recipe to the largest
 * available WebP variant. Originals are never modified or deleted.
 *
 * Usage:
 *   node --env-file=.env.local tools/backfill-meal-image-paths.mjs
 *   node --env-file=.env.local tools/backfill-meal-image-paths.mjs --apply
 *   node --env-file=.env.local tools/backfill-meal-image-paths.mjs --apply --limit=10
 *   node --env-file=.env.local tools/backfill-meal-image-paths.mjs --apply --id=<recipe-id>
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.MEAL_BUCKET ?? "meal"

const CONCURRENCY = Number(process.env.IMAGE_CONCURRENCY ?? 8)
const PAGE_SIZE = 1000
const VARIANT_RE = /^(.*)-(\d+)\.webp$/i
const ALREADY_VARIANT_RE = /-\d+\.webp$/i
const IMAGE_RE = /\.(png|jpe?g|webp|avif)$/i
const STORAGE_PREFIX = `/storage/v1/object/public/${BUCKET}/`

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const quiet = args.includes("--quiet")
const id = args.find((arg) => arg.startsWith("--id="))?.slice("--id=".length)
const limit = Number(
  args.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length) ?? Number.POSITIVE_INFINITY,
)

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  console.error("Run with: node --env-file=.env.local tools/backfill-meal-image-paths.mjs")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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

async function mapLimit(items, max, fn) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(max, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      await fn(items[index])
    }
  })
  await Promise.all(workers)
}

function buildVariantMap(entries) {
  const variants = new Map()

  for (const entry of entries) {
    const match = entry.path.match(VARIANT_RE)
    if (!match) continue

    const [, base, widthRaw] = match
    const width = Number(widthRaw)
    if (!Number.isFinite(width)) continue

    const current = variants.get(base)
    if (!current || width > current.width) {
      variants.set(base, { width, path: entry.path })
    }
  }

  return variants
}

function getObjectPath(imagePath) {
  let url
  try {
    url = new URL(imagePath)
  } catch {
    return null
  }

  const index = url.pathname.indexOf(STORAGE_PREFIX)
  if (index === -1) return null

  return decodeURIComponent(url.pathname.slice(index + STORAGE_PREFIX.length))
}

function resolveImagePath(imagePath, variants) {
  if (!imagePath) return { status: "empty" }

  const objectPath = getObjectPath(imagePath)
  if (!objectPath) return { status: "external" }
  if (ALREADY_VARIANT_RE.test(objectPath)) return { status: "already-variant" }
  if (!IMAGE_RE.test(objectPath)) return { status: "not-image" }

  const base = objectPath.replace(/\.[^./]+$/, "")
  const variant = variants.get(base)
  if (!variant) return { status: "missing", objectPath }

  const url = new URL(imagePath)
  const index = url.pathname.indexOf(STORAGE_PREFIX)
  url.pathname =
    url.pathname.slice(0, index + STORAGE_PREFIX.length) +
    variant.path.split("/").map(encodeURIComponent).join("/")

  return {
    status: "update",
    from: objectPath,
    to: variant.path,
    width: variant.width,
    next: url.toString(),
  }
}

async function fetchRecipes() {
  const recipes = []

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("recipes")
      .select("id,image_path")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (id) query = query.eq("id", id)

    const { data, error } = await query
    if (error) throw error

    recipes.push(...data)
    if (data.length < PAGE_SIZE) break
  }

  return recipes.slice(0, limit)
}

async function main() {
  console.log(`Bucket: ${BUCKET}`)
  console.log(`Mode: ${apply ? "apply" : "dry-run"}${id ? `, id=${id}` : ""}`)

  const entries = await listAll()
  const variants = buildVariantMap(entries)
  const recipes = await fetchRecipes()

  if (id && recipes.length === 0) {
    console.error(`Recipe not found: ${id}`)
    process.exit(1)
  }

  console.log(`Found ${entries.length} storage objects and ${recipes.length} recipes.\n`)

  const stats = {
    update: 0,
    applied: 0,
    failed: 0,
    "already-variant": 0,
    missing: 0,
    external: 0,
    empty: 0,
    "not-image": 0,
  }
  const updates = []

  for (const recipe of recipes) {
    const result = resolveImagePath(recipe.image_path, variants)
    stats[result.status] += 1

    if (result.status === "update") {
      updates.push({ recipe, result })
      if (!quiet && updates.length <= 25) {
        console.log(`${recipe.image_path}`)
        console.log(`  → ${result.next} (${result.width}px)`)
      }
    } else if (!quiet && result.status === "missing" && stats.missing <= 25) {
      console.log(`! no variant: ${result.objectPath}`)
    }
  }

  if (updates.length > 25 && !quiet) {
    console.log(`... and ${updates.length - 25} more updates`)
  }

  if (apply) {
    console.log(`\nApplying ${updates.length} updates (concurrency ${CONCURRENCY})...`)
    await mapLimit(updates, CONCURRENCY, async ({ recipe, result }) => {
      const { error } = await supabase
        .from("recipes")
        .update({ image_path: result.next })
        .eq("id", recipe.id)

      if (error) {
        stats.failed += 1
        console.error(`✗ ${recipe.id}: ${error.message}`)
      } else {
        stats.applied += 1
      }
    })
  }

  console.log(
    `\nDone. update=${stats.update} applied=${stats.applied} failed=${stats.failed} ` +
      `already-variant=${stats["already-variant"]} missing=${stats.missing} ` +
      `external=${stats.external} empty=${stats.empty} not-image=${stats["not-image"]}`,
  )
  if (!apply) console.log("No recipes were updated (dry-run). Re-run with --apply.")
  if (stats.failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
