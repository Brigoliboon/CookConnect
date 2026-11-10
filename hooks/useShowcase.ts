"use client"

import useSWR from "swr"
import type { CategoryTopSeller } from "@/lib/supabase/tables/recipes"

export interface ShowcaseResponse {
  data: CategoryTopSeller[]
}

export const SHOWCASE_URL = "/api/showcase"

async function fetchShowcase(url: string): Promise<ShowcaseResponse> {
  const res = await fetch(url, { credentials: "omit" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch showcase")
  return json as ShowcaseResponse
}

export function useShowcase() {
  return useSWR<ShowcaseResponse>(SHOWCASE_URL, fetchShowcase, {
    dedupingInterval: 30_000,
    revalidateOnFocus: false,
  })
}
