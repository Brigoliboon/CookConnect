export type UserRole = "employee" | "customer" | "rider"

export interface NavItem {
  label: string
  href: string
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  employee: [
    { label: "Dashboard", href: "/employee" },
    { label: "Meals", href: "/employee/meals" },
    { label: "Orders", href: "/employee/orders" },
    { label: "Chef", href: "/employee/chef" },
    { label: "Subscriptions", href: "/employee/subscriptions" },
    { label: "Deliveries", href: "/employee/deliveries" },
    { label: "Accounts", href: "/employee/accounts" },
  ],
  customer: [
    { label: "Home", href: "/customer" },
    { label: "Profile", href: "/customer/profile" },
  ],
  rider: [
    { label: "Dashboard", href: "/rider" },
  ],
}

export type EmployeeBadgeKey = "orders" | "subscriptions"

export interface EmployeeShellItem {
  key: string
  label: string
  href: string
  badge?: EmployeeBadgeKey
}

/** Tablet/desktop icon rail, top to bottom. "More" is rendered separately at the foot. */
export const EMPLOYEE_RAIL_ITEMS: EmployeeShellItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/employee" },
  { key: "orders", label: "Orders", href: "/employee/orders", badge: "orders" },
  { key: "subs", label: "Subs", href: "/employee/subscriptions", badge: "subscriptions" },
  { key: "chef", label: "Chef", href: "/employee/chef" },
  { key: "meals", label: "Meals", href: "/employee/meals" },
]

export const EMPLOYEE_MORE_NAV: EmployeeShellItem = {
  key: "more",
  label: "More",
  href: "/employee/more",
}

/** Phone bottom tabs, left to right. */
export const EMPLOYEE_PHONE_TABS: EmployeeShellItem[] = [
  ...EMPLOYEE_RAIL_ITEMS.filter((item) => item.key !== "meals"),
  EMPLOYEE_MORE_NAV,
]

export interface EmployeeMoreItem {
  key: string
  label: string
  description: string
  href: string | null
  comingSoon: boolean
}

export const EMPLOYEE_MORE_ITEMS: EmployeeMoreItem[] = [
  {
    key: "deliveries",
    label: "Deliveries",
    description: "Today's times, locations and statuses",
    href: "/employee/deliveries",
    comingSoon: false,
  },
  {
    key: "customers",
    label: "Customers",
    description: "Customer list and details",
    href: "/employee/customers",
    comingSoon: false,
  },
  {
    key: "renewals",
    label: "Renewals",
    description: "Reminder queue",
    href: null,
    comingSoon: true,
  },
  {
    key: "meals",
    label: "Meals",
    description: "Menu catalog",
    href: "/employee/meals",
    comingSoon: false,
  },
  {
    key: "plans",
    label: "Subscription plans",
    description: "Plan catalog",
    href: "/employee/meals/subscription",
    comingSoon: false,
  },
  {
    key: "accounts",
    label: "Accounts",
    description: "Staff accounts and invites",
    href: "/employee/accounts",
    comingSoon: false,
  },
  {
    key: "settings",
    label: "Settings",
    description: "App and notification preferences",
    href: null,
    comingSoon: true,
  },
]

const RAIL_HREFS = new Set(EMPLOYEE_RAIL_ITEMS.map((item) => item.href))

/** Destinations under More that are not also primary rail items (Meals). */
const MORE_SECTION_PREFIXES = EMPLOYEE_MORE_ITEMS
  .map((item) => item.href)
  .filter((href): href is string => typeof href === "string" && !RAIL_HREFS.has(href))

export function isEmployeeItemActive(pathname: string, item: EmployeeShellItem): boolean {
  if (item.key === "dashboard") return pathname === "/employee"
  if (item.key === "orders") {
    return pathname === "/employee/orders" || pathname.startsWith("/employee/orders/")
  }
  if (item.key === "subs") {
    return pathname === "/employee/subscriptions" || pathname.startsWith("/employee/subscriptions/")
  }
  if (item.key === "chef") {
    return pathname === "/employee/chef" || pathname.startsWith("/employee/chef/")
  }
  if (item.key === "meals") {
    if (pathname === "/employee/meals") return true
    if (pathname.startsWith("/employee/meals/subscription")) return false
    return pathname.startsWith("/employee/meals/")
  }
  if (item.key === "more") {
    if (pathname === "/employee/more" || pathname.startsWith("/employee/more/")) return true
    return MORE_SECTION_PREFIXES.some(
      (href) => pathname === href || pathname.startsWith(`${href}/`),
    )
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function formatBadgeCount(count: number): string | null {
  if (count <= 0) return null
  return count > 99 ? "99+" : String(count)
}

export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
