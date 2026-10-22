"use client"

import useSWR, { mutate } from "swr"
import type { RecipeWithServings } from "@/lib/supabase/tables/recipes"

export interface RecipeListResponse {
  data: RecipeWithServings[]
  total: number
}

export interface RecipeListParams {
  ids?: string
  category?: string
  search?: string
  sort?: string
  minCalories?: string | number
  maxCalories?: string | number
  minPrice?: string | number
  maxPrice?: string | number
  isActive?: boolean
  offset?: number
  limit?: number
}

export function recipeListUrl(params: RecipeListParams): string {
  const search = new URLSearchParams()
  if (params.ids) search.set("ids", params.ids)
  if (params.category) search.set("category", params.category)
  if (params.search) search.set("search", params.search)
  if (params.sort) search.set("sort", params.sort)
  if (params.minCalories !== undefined && params.minCalories !== "") search.set("min_cal", String(params.minCalories))
  if (params.maxCalories !== undefined && params.maxCalories !== "") search.set("max_cal", String(params.maxCalories))
  if (params.minPrice !== undefined && params.minPrice !== "") search.set("min_price", String(params.minPrice))
  if (params.maxPrice !== undefined && params.maxPrice !== "") search.set("max_price", String(params.maxPrice))
  if (params.isActive !== undefined) search.set("is_active", String(params.isActive))
  if (params.offset !== undefined) search.set("offset", String(params.offset))
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  return `/api/recipe?${search.toString()}`
}

export async function fetchRecipeList(url: string): Promise<RecipeListResponse> {
  const res = await fetch(url, { credentials: "omit" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch recipes")
  return json as RecipeListResponse
}

export function useRecipes(url: string | null, fallbackData?: RecipeListResponse) {
  return useSWR<RecipeListResponse>(url, fetchRecipeList, {
    fallbackData,
    dedupingInterval: 30_000,
    revalidateOnFocus: false,
  })
}

export function invalidateRecipes() {
  return mutate(
    (key) => {
      const value = Array.isArray(key) ? key[0] : key
      return typeof value === "string" && value.startsWith("/api/recipe?")
    },
    undefined,
    { revalidate: true },
  )
}
