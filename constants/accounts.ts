import type { UserRole } from "./navigation"
import { CUSTOMERS } from "./customers"
import { RIDERS } from "./deliveries"

export interface Account {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export const ACCOUNTS: Account[] = [
  ...CUSTOMERS.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    role: "customer" as UserRole,
    isActive: c.isActive,
    createdAt: c.createdAt,
  })),
  ...RIDERS.map((r, i) => ({
    id: r.id,
    name: r.name,
    email: `${r.name.toLowerCase().replace(" ", ".")}@cookconnect.ph`,
    role: "rider" as UserRole,
    isActive: true,
    createdAt: `2025-0${3 + i}-15`,
  })),
  { id: "E-001", name: "Juan Dela Cruz", email: "juan@cookconnect.ph", role: "employee" as UserRole, isActive: true, createdAt: "2024-12-01" },
]

export const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: "Customer", value: "customer" },
  { label: "Rider", value: "rider" },
  { label: "Employee", value: "employee" },
]
