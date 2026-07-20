"use client"

import { useAuth } from "@/hooks/AuthProvider"
import { Navbar } from "@/components/layout/Navbar"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/login")
      return
    }
    const expectedPrefix = `/${user.role}`
    if (!pathname.startsWith(expectedPrefix)) {
      router.push(`/${user.role}`)
    }
  }, [user, loading, router, pathname])

  if (loading) return <div className="flex flex-1 items-center justify-center text-brand-900">Loading...</div>
  if (!user) return null

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6">{children}</main>
    </>
  )
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
