"use client"

import { useState, useEffect } from "react"

type Theme = "light" | "dark"

export function useTheme() {
  const [theme] = useState<Theme>("light")

  useEffect(() => {
    document.documentElement.classList.remove("dark")
  }, [])

  const toggle = () => {}

  return { theme, toggle } as const
}
