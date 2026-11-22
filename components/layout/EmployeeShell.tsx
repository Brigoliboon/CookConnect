"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChefHat,
  ChevronDown,
  ClipboardList,
  Ellipsis,
  LayoutDashboard,
  Leaf,
  RefreshCw,
  Utensils,
} from "lucide-react"
import { useAuth } from "@/hooks/AuthProvider"
import { useNavCounts } from "@/hooks/useNavCounts"
import {
  EMPLOYEE_MORE_NAV,
  EMPLOYEE_PHONE_TABS,
  EMPLOYEE_RAIL_ITEMS,
  formatBadgeCount,
  isEmployeeItemActive,
  userInitials,
  type EmployeeBadgeKey,
  type EmployeeShellItem,
} from "@/constants/navigation"
import { NotificationMenu } from "@/components/layout/NotificationMenu"

const iconMap: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  orders: ClipboardList,
  subs: RefreshCw,
  chef: ChefHat,
  meals: Utensils,
  more: Ellipsis,
}

const FULL_BLEED_PATHS = [/^\/employee\/orders\/pos(\/|$)/]

function CountBadge({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  const label = formatBadgeCount(count)
  if (!label) return null
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#B91C1C] px-[5px] text-[12px] font-semibold leading-[18px] text-white tabular-nums ${className ?? ""}`}
    >
      {label}
    </span>
  )
}

function useBadgeValue(counts: { orders: number; subscriptions: number }, key?: EmployeeBadgeKey) {
  if (key === "orders") return counts.orders
  if (key === "subscriptions") return counts.subscriptions
  return 0
}

function RailLink({
  item,
  pathname,
  counts,
}: {
  item: EmployeeShellItem
  pathname: string
  counts: { orders: number; subscriptions: number }
}) {
  const active = isEmployeeItemActive(pathname, item)
  const Icon = iconMap[item.key] ?? Ellipsis
  const count = useBadgeValue(counts, item.badge)
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-xl px-0 py-2 text-[#475569] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
        active ? "bg-[#F0FDF4] text-[#166534]" : "hover:bg-[#F1F5F9] hover:text-[#1E293B]"
      }`}
    >
      <span className="relative inline-flex">
        <Icon size={20} />
        <CountBadge count={count} className="absolute -top-1.5 -right-2.5" />
      </span>
      <span className={`text-center text-xs leading-tight ${active ? "font-semibold" : "font-medium"}`}>
        {item.label}
      </span>
    </Link>
  )
}

function TabLink({
  item,
  pathname,
  counts,
}: {
  item: EmployeeShellItem
  pathname: string
  counts: { orders: number; subscriptions: number }
}) {
  const mealsItem = EMPLOYEE_RAIL_ITEMS.find((entry) => entry.key === "meals")
  const active =
    isEmployeeItemActive(pathname, item) ||
    (item.key === "more" && mealsItem != null && isEmployeeItemActive(pathname, mealsItem))
  const Icon = iconMap[item.key] ?? Ellipsis
  const count = useBadgeValue(counts, item.badge)
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[#475569] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
        active ? "text-[#166534]" : "hover:text-[#1E293B]"
      }`}
    >
      <span className="relative inline-flex">
        <Icon size={20} />
        <CountBadge count={count} className="absolute -top-2 -right-3" />
      </span>
      <span className={`text-xs leading-none ${active ? "font-semibold" : "font-medium"}`}>
        {item.label}
      </span>
    </Link>
  )
}

function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8 rounded-[10px]" : "size-10 rounded-xl"
  const icon = size === "sm" ? 16 : 20
  return (
    <span className={`flex shrink-0 items-center justify-center bg-[#DCFCE7] text-[#166534] ${box}`}>
      <Leaf size={icon} />
    </span>
  )
}

function AccountMenu({ name }: { name: string }) {
  const { signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = userInitials(name || "")

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-12 items-center gap-2 rounded-xl border-0 bg-transparent py-0 pr-2.5 pl-1 text-[#1E293B] transition-colors hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-xs font-semibold tracking-wide text-[#1E3A8A]">
          {initials}
        </span>
        {name ? (
          <span className="hidden text-sm font-medium whitespace-nowrap md:inline">{name}</span>
        ) : null}
        <ChevronDown size={16} className="hidden text-[#475569] md:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          {name ? (
            <div className="border-b border-[#F1F5F9] px-3 py-2 text-xs font-medium text-[#475569] md:hidden">
              {name}
            </div>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              setOpen(false)
              await signOut()
              router.push("/login")
            }}
            className="flex min-h-11 w-full items-center px-3 text-left text-sm font-medium text-[#1E293B] transition-colors hover:bg-[#F8FAFC]"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export function EmployeeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const counts = useNavCounts(true)
  const fullBleed = FULL_BLEED_PATHS.some((re) => re.test(pathname))

  useEffect(() => {
    const html = document.documentElement
    const { body } = document
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    }
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    html.style.overscrollBehavior = "none"
    body.style.overscrollBehavior = "none"
    return () => {
      html.style.overflow = previous.htmlOverflow
      body.style.overflow = previous.bodyOverflow
      html.style.overscrollBehavior = previous.htmlOverscroll
      body.style.overscrollBehavior = previous.bodyOverscroll
    }
  }, [])

  return (
    <div
      className="fixed inset-0 flex h-dvh w-full overflow-hidden overscroll-none bg-[#F8FAFC] text-[#1E293B]"
      style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}
    >
      <aside
        className="hidden h-full w-24 shrink-0 flex-col items-stretch bg-[#F8FAFC] px-2.5 py-5 md:flex"
        aria-label="Staff navigation"
      >
        <div className="mb-6 flex h-12 items-center justify-center">
          <Link href="/employee" title="CookConnect" aria-label="CookConnect dashboard">
            <BrandMark />
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {EMPLOYEE_RAIL_ITEMS.map((item) => (
            <RailLink key={item.key} item={item} pathname={pathname} counts={counts} />
          ))}
        </div>
        <div className="mt-auto pt-4">
          <RailLink item={EMPLOYEE_MORE_NAV} pathname={pathname} counts={counts} />
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 md:h-16 md:gap-4 md:px-8">
          <Link href="/employee" className="flex items-center gap-2 md:hidden" aria-label="CookConnect dashboard">
            <BrandMark size="sm" />
          </Link>
          <div className="text-lg font-semibold tracking-tight text-[#1E293B]">CookConnect</div>
          <div className="flex-1" />
          <NotificationMenu />
          <AccountMenu name={user?.name ?? ""} />
        </header>

        <main
          className={
            fullBleed
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain p-6"
          }
        >
          {children}
        </main>

        <nav
          className="flex shrink-0 items-start justify-around border-t border-[#E2E8F0] bg-white px-2 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
          aria-label="Staff navigation"
        >
          {EMPLOYEE_PHONE_TABS.map((item) => (
            <TabLink key={item.key} item={item} pathname={pathname} counts={counts} />
          ))}
        </nav>
      </div>
    </div>
  )
}
