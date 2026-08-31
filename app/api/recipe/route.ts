import { createRecipe, listRecipes, type CreateRecipeInput, type ListRecipesFilters, type RecipeSort } from "@/lib/supabase/tables/recipes"
import { createServing, linkServingIngredients, type ServingIngredientInput } from "@/lib/supabase/tables/servings"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

interface ServingInput {
  name?: string | null
  price?: number | null
  calories?: number | null
  nutrition?: Record<string, unknown> | null
  is_active?: boolean
  ingredients?: ServingIngredientInput[]
}

interface CreateMealBody extends CreateRecipeInput {
  price?: number | null
  calories?: number | null
  nutrition?: Record<string, unknown> | null
  ingredients?: ServingIngredientInput[]
  servings?: ServingInput[]
}

const SORTS = new Set<RecipeSort>(["name", "name_desc", "calories", "calories_desc", "price", "price_desc"])
const MAX_LIMIT = 100

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let filters: ListRecipesFilters
  try {
    filters = parseRecipeFilters(new URL(request.url).searchParams)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid filter parameters"
    return Response.json({ error: message }, { status: 400 })
  }

  try {
    const recipes = await listRecipes(supabase, filters)
    return Response.json(recipes)
  } catch (err) {
    console.error("[API] GET /api/recipe error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message, detail: err instanceof Error ? err.stack : null }, { status: 500 })
  }
}

function parseRecipeFilters(params: URLSearchParams): ListRecipesFilters {
  const parseNumber = (name: string) => {
    const value = params.get(name)
    if (value === null || value === "") return undefined
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number`)
    return parsed
  }
  const parseNonNegativeInteger = (name: string) => {
    const value = parseNumber(name)
    if (value === undefined) return undefined
    if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`)
    return value
  }

  const sort = params.get("sort") ?? undefined
  if (sort && !SORTS.has(sort as RecipeSort)) throw new Error("sort is invalid")

  const active = params.get("is_active")
  if (active !== null && active !== "true" && active !== "false") {
    throw new Error("is_active must be true or false")
  }

  const minCalories = parseNumber("min_cal")
  const maxCalories = parseNumber("max_cal")
  const minPrice = parseNumber("min_price")
  const maxPrice = parseNumber("max_price")
  if (minCalories !== undefined && maxCalories !== undefined && minCalories > maxCalories) {
    throw new Error("min_cal cannot be greater than max_cal")
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new Error("min_price cannot be greater than max_price")
  }

  const limit = parseNonNegativeInteger("limit")
  if (limit !== undefined && (limit < 1 || limit > MAX_LIMIT)) {
    throw new Error(`limit must be between 1 and ${MAX_LIMIT}`)
  }

  return {
    search: params.get("search")?.trim() || undefined,
    category: params.get("category")?.trim() || undefined,
    isActive: active === null ? undefined : active === "true",
    minCalories,
    maxCalories,
    minPrice,
    maxPrice,
    sort: sort as RecipeSort | undefined,
    offset: parseNonNegativeInteger("offset"),
    limit,
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: CreateMealBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const recipe = await createRecipe(supabase, body)

    const createdServings = []

    if (body.servings?.length) {
      for (const serving of body.servings) {
        const servingIngredients = serving.ingredients ?? []
        const linkedIngredients = await linkServingIngredients(supabase, servingIngredients)

        const created = await createServing(
          supabase,
          recipe.id,
          {
            name: serving.name ?? null,
            price: serving.price ?? null,
            calories: serving.calories ?? null,
            nutrition: serving.nutrition ?? null,
            is_active: serving.is_active ?? true,
          },
          linkedIngredients,
        )
        createdServings.push(created)
      }
    } else if (body.ingredients?.length || body.price || body.calories || body.nutrition) {
      const linkedIngredients = await linkServingIngredients(supabase, body.ingredients ?? [])

      const created = await createServing(
        supabase,
        recipe.id,
        {
          name: "Regular",
          price: body.price ?? null,
          calories: body.calories ?? null,
          nutrition: body.nutrition ?? null,
          is_active: true,
        },
        linkedIngredients,
      )
      createdServings.push(created)
    }

    return Response.json({ ...recipe, servings: createdServings }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return Response.json({ error: message }, { status: 500 })
  }
}
