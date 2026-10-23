import { getTopSellersByCategory } from "@/lib/supabase/tables/recipes"
import { etaggedJson, NO_STORE_HEADERS } from "@/utils/httpCache"
import { createPublicClient } from "@/utils/supabase/public"

const DEFAULT_CATEGORIES = ["beef", "seafood", "wrap", "pizza"]
const MAX_CATEGORIES = 20
const MAX_CATEGORY_LENGTH = 64

export async function GET(request: Request) {
  const supabase = createPublicClient()

  let categories: string[]
  try {
    categories = parseCategories(new URL(request.url).searchParams)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid categories"
    return Response.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS })
  }

  try {
    const data = await getTopSellersByCategory(supabase, categories)
    return etaggedJson(request, { data })
  } catch (err) {
    console.error("[API] GET /api/showcase error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS })
  }
}

function parseCategories(params: URLSearchParams): string[] {
  const raw = params.get("categories")
  if (raw === null) return [...DEFAULT_CATEGORIES]

  const categories = raw.split(",").map((value) => value.trim()).filter(Boolean)
  if (categories.length === 0) throw new Error("categories must contain at least one value")
  if (categories.length > MAX_CATEGORIES) {
    throw new Error(`categories must contain at most ${MAX_CATEGORIES} values`)
  }
  if (categories.some((category) => category.length > MAX_CATEGORY_LENGTH)) {
    throw new Error(`each category must be at most ${MAX_CATEGORY_LENGTH} characters`)
  }
  return categories
}
