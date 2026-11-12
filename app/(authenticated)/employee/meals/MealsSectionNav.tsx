"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/employee/meals", label: "Menu" },
  { href: "/employee/meals/subscription", label: "Subscription plan" },
] as const

export function MealsSectionNav() {
  const pathname = usePathname()

  return (
    <div className="flex w-fit items-center gap-1 rounded-xl border border-neutral-200 bg-white/80 p-1 backdrop-blur-sm">
      {TABS.map((tab) => {
        const active =
          tab.href === "/employee/meals"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              active ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
