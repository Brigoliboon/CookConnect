export type UserRole = "employee" | "customer" | "rider"

export interface NavItem {
  label: string
  href: string
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  employee: [
    { label: "Dashboard", href: "/employee" },
    { label: "Customers", href: "/employee/customers" },
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
