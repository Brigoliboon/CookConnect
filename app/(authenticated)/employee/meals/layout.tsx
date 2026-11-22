"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { MealsSectionNav } from "@/components/meals/MealsSectionNav"

export default function MealsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // The Menu page renders the tabs under its own heading.
  if (pathname === "/employee/meals") return children

  return (
    <div>
      <div className="mb-4">
        <MealsSectionNav />
      </div>
      {children}
    </div>
  )
}
