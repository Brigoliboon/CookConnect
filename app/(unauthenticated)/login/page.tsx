"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input } from "@/components/ui"
import { useAuth } from "@/hooks/AuthProvider"
import { Bike, User, ShieldCheck, Utensils, ArrowRight } from "lucide-react"

const QUICK_LOGINS = [
  { label: "Employee", role: "employee", name: "Juan Dela Cruz", email: "juan@cookconnect.ph", password: "password123", icon: ShieldCheck },
  { label: "Rider", role: "rider", name: "Kevin Ramos", email: "kevin@cookconnect.ph", password: "password123", icon: Bike },
  { label: "Customer", role: "customer", name: "Maria Santos", email: "maria@cookconnect.ph", password: "password123", icon: User },
]

function LoginForm() {
  const router = useRouter()
  const { mockLogin } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [logging, setLogging] = useState<string | null>(null)

  function handleQuickLogin(role: string, credEmail: string, credPassword: string) {
    setEmail(credEmail)
    setPassword(credPassword)
    setLogging(role)
    setTimeout(() => {
      mockLogin(role)
      router.push(`/${role}`)
    }, 400)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLogging("form")
    setTimeout(() => {
      mockLogin("rider")
      router.push("/rider")
    }, 500)
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center bg-white px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10">
            <div className="mb-2 flex items-center gap-2 text-2xl font-bold text-brand-900">
              <Utensils size={24} />
              CookConnect
            </div>
            <p className="text-sm text-text-secondary">Sign in to manage your meal plans</p>
          </div>

          <div className="mb-8 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Quick access</p>
            {QUICK_LOGINS.map((q) => {
              const Icon = q.icon
              const isLogging = logging === q.role
              return (
                <button
                  key={q.role}
                  onClick={() => handleQuickLogin(q.role, q.email, q.password)}
                  disabled={logging !== null}
                  className="group flex w-full items-center gap-4 rounded-xl border border-border-light bg-surface p-4 text-left transition-all hover:border-brand-400 hover:bg-brand-400/10 disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-brand-900">{q.label}</div>
                    <div className="text-xs text-text-secondary">{q.name}</div>
                  </div>
                  {isLogging ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-900 border-t-transparent" />
                  ) : (
                    <ArrowRight size={18} className="text-text-secondary transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-light" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-text-secondary">or sign in manually</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" className="w-full" disabled={logging !== null}>
              {logging === "form" ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-16 text-white">
        <Utensils size={64} className="mb-6 opacity-80" />
        <h1 className="mb-4 text-center text-3xl font-bold">Welcome back</h1>
        <p className="max-w-sm text-center text-lg text-white/80">
          Manage subscriptions, track deliveries, and keep your customers happy — all in one place.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
