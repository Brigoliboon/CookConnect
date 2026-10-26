"use client"

import { usePathname } from "next/navigation"
import { isNavbarHidden } from "@/components/layout/Navbar"

const FULL_BLEED_PATHS = [/^\/employee\/orders\/pos(\/|$)/]

export function AuthMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hidden = isNavbarHidden(pathname)
  const fullBleed = FULL_BLEED_PATHS.some((re) => re.test(pathname))
  return (
    <main className={hidden ? "flex-1" : fullBleed ? "min-h-0 flex-1 pt-16" : "flex-1 p-6 pt-16"}>
      {children}
    </main>
  )
}
