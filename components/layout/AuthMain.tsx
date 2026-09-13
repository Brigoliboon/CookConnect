"use client"

import { usePathname } from "next/navigation"
import { isNavbarHidden } from "@/components/layout/Navbar"

export function AuthMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hidden = isNavbarHidden(pathname)
  return <main className={hidden ? "flex-1" : "flex-1 p-6 pt-16"}>{children}</main>
}
