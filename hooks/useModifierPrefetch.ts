"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import { prefetchMealModifierGroups } from "@/lib/modifiers"

/** Prefetch modifier groups when a meal card enters view, or on hover / touch. */
export function useModifierPrefetch<T extends HTMLElement = HTMLElement>(
  recipeId: string | undefined,
  enabled: boolean,
): {
  elementRef: RefObject<T | null>
  prefetch: () => void
} {
  const elementRef = useRef<T | null>(null)

  const prefetch = useCallback(() => {
    if (!enabled || !recipeId) return
    void prefetchMealModifierGroups(recipeId)
  }, [enabled, recipeId])

  useEffect(() => {
    const node = elementRef.current
    if (!node || !enabled || !recipeId) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          prefetch()
          io.disconnect()
        }
      },
      { rootMargin: "200px" },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [enabled, recipeId, prefetch])

  return { elementRef, prefetch }
}
