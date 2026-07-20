"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input } from "@/components/ui"
import { useAuth } from "@/hooks/AuthProvider"
import Link from "next/link"
import { Bike, User, ShieldCheck, Utensils } from "lucide-react"

const QUICK_LOGINS = [
  { label: "Employee", role: "employee", name: "Juan Dela Cruz", id: "E-001", email: "juan@cookconnect.ph", password: "password123", icon: ShieldCheck, color: "bg-brand-900 hover:bg-brand-700" },
  { label: "Rider", role: "rider", name: "Kevin Ramos", id: "R-001", email: "kevin@cookconnect.ph", password: "password123", icon: Bike, color: "bg-blue-600 hover:bg-blue-700" },
  { label: "Customer", role: "customer", name: "Maria Santos", id: "C-001", email: "maria@cookconnect.ph", password: "password123", icon: User, color: "bg-amber-600 hover:bg-amber-700" },
]

function LoginForm() {
  const router = useRouter()
  const { mockLogin } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [logging, setLogging] = useState(false)

  function handleQuickLogin(role: string, credEmail: string, credPassword: string) {
    setEmail(credEmail)
    setPassword(credPassword)
    setLogging(true)
    setTimeout(() => {
      mockLogin(role)
      router.push(`/${role}`)
    }, 400)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true)
    setTimeout(() => {
      mockLogin("rider")
      router.push("/rider")
    }, 500)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-900/5 via-surface to-brand-400/10 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-3xl font-bold text-brand-900">
            <Utensils size={28} />
            CookConnect
          </Link>
          <p className="mt-2 text-sm text-text-secondary">Choose how you want to sign in</p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {QUICK_LOGINS.map((q) => {
            const Icon = q.icon
            return (
              <button
                key={q.role}
                onClick={() => handleQuickLogin(q.role, q.email, q.password)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border-light bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${q.color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-sm font-medium text-brand-900">{q.label}</span>
                <span className="text-[10px] text-text-secondary">{q.name}</span>
              </button>
            )
          })}
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-light" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-text-secondary">or sign in with email</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-light bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={logging}>
              {logging ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
