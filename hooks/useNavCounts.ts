"use client"

import useSWR from "swr"

export interface NavCounts {
  orders: number
  subscriptions: number
}

export const NAV_COUNTS_URL = "/api/nav-counts"

async function fetchNavCounts(url: string): Promise<NavCounts> {
  const res = await fetch(url, { cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch nav counts")
  return json as NavCounts
}

export function useNavCounts(enabled = true) {
  const { data } = useSWR<NavCounts>(enabled ? NAV_COUNTS_URL : null, fetchNavCounts, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  })

  return {
    orders: data?.orders ?? 0,
    subscriptions: data?.subscriptions ?? 0,
  }
}
