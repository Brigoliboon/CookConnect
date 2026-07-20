"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { UserRole } from "@/constants"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

const MOCK_USERS: Record<string, User> = {
  employee: { id: "E-001", name: "Juan Dela Cruz", email: "juan@cookconnect.ph", role: "employee" },
  rider: { id: "R-001", name: "Kevin Ramos", email: "kevin@cookconnect.ph", role: "rider" },
  customer: { id: "C-001", name: "Maria Santos", email: "maria@cookconnect.ph", role: "customer" },
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  mockLogin: (role: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading] = useState(false)

  const signIn = useCallback(async (email: string, password: string) => {
    // TODO: Wire to Supabase Auth
    console.log("signIn", email, password)
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
  }, [])

  const mockLogin = useCallback((role: string) => {
    const u = MOCK_USERS[role]
    if (u) setUser(u)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, mockLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
