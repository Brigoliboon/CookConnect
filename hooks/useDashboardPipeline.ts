"use client"

import useSWR from "swr"

export interface PipelineCounts {
  inquiry: number
  confirmed: number
  preparing: number
  ready_for_pickup: number
  out_for_delivery: number
}

export const PIPELINE_URL = "/api/dashboard/pipeline"

const EMPTY_COUNTS: PipelineCounts = {
  inquiry: 0,
  confirmed: 0,
  preparing: 0,
  ready_for_pickup: 0,
  out_for_delivery: 0,
}

async function fetchPipeline(url: string): Promise<PipelineCounts> {
  const res = await fetch(url, { cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? "Failed to load order pipeline")
  return json as PipelineCounts
}

export function useDashboardPipeline(enabled = true) {
  const { data, isLoading, error } = useSWR<PipelineCounts>(
    enabled ? PIPELINE_URL : null,
    fetchPipeline,
    { refreshInterval: 30_000, revalidateOnFocus: true, dedupingInterval: 5_000 },
  )

  const counts = data ?? EMPTY_COUNTS

  return {
    counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    loading: isLoading,
    error,
  }
}
