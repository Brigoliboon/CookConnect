"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Layers, Utensils } from "lucide-react"

const TABS = [
  { href: "/employee/meals", label: "Menu", icon: Utensils },
  { href: "/employee/meals/modifiers", label: "Modifiers", icon: Layers },
  { href: "/employee/meals/subscription", label: "Subscription plans", icon: CalendarDays },
] as const

export function MealsSectionNav() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Meals sections">
      {TABS.map((tab) => {
        const active =
          tab.href === "/employee/meals"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
              active
                ? "bg-[#1E293B] font-semibold text-[#F8FAFC]"
                : "font-medium text-[#475569] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
            }`}
          >
            <Icon size={16} />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
