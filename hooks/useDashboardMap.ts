"use client"

import useSWR from "swr"

export interface DashboardMapOrder {
  id: string
  name: string
  status: string
  address: string | null
  location: unknown
}

export const DASHBOARD_MAP_URL = "/api/dashboard/map"

async function fetchMapOrders(url: string): Promise<DashboardMapOrder[]> {
  const res = await fetch(url, { cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? "Failed to load map orders")
  return json as DashboardMapOrder[]
}

export function useDashboardMap(enabled = true) {
  const { data, isLoading, error } = useSWR<DashboardMapOrder[]>(
    enabled ? DASHBOARD_MAP_URL : null,
    fetchMapOrders,
    { refreshInterval: 30_000, revalidateOnFocus: true, dedupingInterval: 5_000 },
  )

  return {
    orders: data ?? [],
    loading: isLoading,
    error,
  }
}
