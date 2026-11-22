import Link from "next/link"
import type { ComponentType } from "react"
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Ellipsis,
  Settings,
  Truck,
  UserCog,
  Users,
  Utensils,
} from "lucide-react"
import { EMPLOYEE_MORE_ITEMS } from "@/constants/navigation"

const iconMap: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  deliveries: Truck,
  customers: Users,
  meals: Utensils,
  renewals: CalendarClock,
  plans: CalendarDays,
  accounts: UserCog,
  settings: Settings,
}

export default function EmployeeMorePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[#0F172A] md:text-2xl">
          <Ellipsis size={22} className="text-[#475569]" />
          More
        </h1>
        <p className="mt-2 text-sm text-[#475569] md:text-base">Everything else</p>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white px-2 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] md:px-3">
        {EMPLOYEE_MORE_ITEMS.map((item) => {
          const Icon = iconMap[item.key] ?? Ellipsis
          const body = (
            <>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155]">
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold tracking-tight text-[#0F172A]">{item.label}</div>
                <div className="text-sm text-[#475569]">{item.description}</div>
              </div>
              {item.comingSoon ? (
                <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#475569]">
                  Coming soon
                </span>
              ) : (
                <ChevronRight size={20} className="shrink-0 text-[#475569]" />
              )}
            </>
          )

          if (item.comingSoon || !item.href) {
            return (
              <div
                key={item.key}
                aria-disabled="true"
                className="flex min-h-16 w-full items-center gap-3 rounded-xl px-2 py-3 text-left opacity-60"
              >
                {body}
              </div>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex min-h-16 w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-inherit transition-colors hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
            >
              {body}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
