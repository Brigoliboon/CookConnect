"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { createClient } from "@/utils/supabase/client"
import type { UserRole } from "@/constants"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<UserRole>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchProfile(id: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("accounts")
    .select("role, name, is_active")
    .eq("id", id)
    .single()
  return data as { role: string; name: string | null; is_active: boolean } | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (profile?.role && profile.is_active) {
          setUser({
            id: session.user.id,
            name: profile.name || session.user.email?.split("@")[0] || "",
            email: session.user.email || "",
            role: profile.role as UserRole,
          })
        } else {
          setUser(null)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (profile?.role && profile.is_active) {
          setUser({
            id: session.user.id,
            name: profile.name || session.user.email?.split("@")[0] || "",
            email: session.user.email || "",
            role: profile.role as UserRole,
          })
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const profile = await fetchProfile(data.user.id)
    if (!profile?.role) throw new Error("No role assigned to this account")
    if (!profile.is_active) throw new Error("This account has been disabled")

    return profile.role as UserRole
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
