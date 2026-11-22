"use client"

import { usePathname } from "next/navigation"
import { AuthMain, isNavbarHidden } from "@/components/layout/AuthMain"
import { EmployeeShell } from "@/components/layout/EmployeeShell"
import { Navbar } from "@/components/layout/Navbar"

export function AuthChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isNavbarHidden(pathname)) {
    return <main className="flex-1">{children}</main>
  }

  if (pathname === "/employee" || pathname.startsWith("/employee/")) {
    return <EmployeeShell>{children}</EmployeeShell>
  }

  return (
    <>
      <Navbar />
      <AuthMain>{children}</AuthMain>
    </>
  )
}
