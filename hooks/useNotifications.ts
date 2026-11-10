"use client"

import { useCallback } from "react"
import useSWR from "swr"
import type { NotificationFeed } from "@/lib/supabase/tables/notifications"

export const NOTIFICATIONS_URL = "/api/notifications?limit=20"

async function fetchNotifications(url: string): Promise<NotificationFeed> {
  const res = await fetch(url, { cache: "no-store" })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch notifications")
  return json as NotificationFeed
}

export function useNotifications(enabled = true) {
  const { data, isLoading, mutate } = useSWR<NotificationFeed>(
    enabled ? NOTIFICATIONS_URL : null,
    fetchNotifications,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    },
  )

  const markRead = useCallback(
    async (ids: string[]) => {
      const feed = data
      if (!feed || ids.length === 0) return

      const now = new Date().toISOString()
      const unreadTargets = feed.notifications.filter((n) => ids.includes(n.id) && !n.read_at)
      const optimistic: NotificationFeed = {
        notifications: feed.notifications.map((n) =>
          ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n,
        ),
        unreadCount: Math.max(0, feed.unreadCount - unreadTargets.length),
      }

      try {
        await mutate(
          async () => {
            const res = await fetch("/api/notifications", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids }),
            })
            if (!res.ok) {
              const json = await res.json().catch(() => ({}))
              throw new Error(json?.error ?? "Failed to mark notifications read")
            }
            return optimistic
          },
          { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
        )
      } catch (err) {
        console.error("[notifications] mark read failed:", err)
      }
    },
    [data, mutate],
  )

  const markAllRead = useCallback(async () => {
    const feed = data
    if (!feed || feed.unreadCount === 0) return

    const now = new Date().toISOString()
    const optimistic: NotificationFeed = {
      notifications: feed.notifications.map((n) => ({ ...n, read_at: n.read_at ?? now })),
      unreadCount: 0,
    }

    try {
      await mutate(
        async () => {
          const res = await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true }),
          })
          if (!res.ok) {
            const json = await res.json().catch(() => ({}))
            throw new Error(json?.error ?? "Failed to mark notifications read")
          }
          return optimistic
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
      )
    } catch (err) {
      console.error("[notifications] mark all read failed:", err)
    }
  }, [data, mutate])

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    loading: isLoading,
    markRead,
    markAllRead,
  }
}
