"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bike, User, ShieldCheck, Utensils, ArrowRight } from "lucide-react"
import { useAuth } from "@/hooks/AuthProvider"

const QUICK_LOGINS = [
  { label: "Employee", role: "employee", name: "Juan Dela Cruz", email: "juan@cookconnect.ph", password: "password123", icon: ShieldCheck },
  { label: "Rider", role: "rider", name: "Kevin Ramos", email: "kevin@cookconnect.ph", password: "password123", icon: Bike },
  { label: "Customer", role: "customer", name: "Maria Santos", email: "maria@cookconnect.ph", password: "password123", icon: User },
]

const inputClass =
  "font-nunito w-full border-b border-black/10 bg-transparent px-0 py-3 text-sm text-black outline-none transition-colors placeholder:text-black/20 focus:border-black"

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
            <div className="mb-6 flex justify-center">
              <img src="/logo-horizontal.png" alt="CookConnect" className="h-14 object-contain opacity-90" />
            </div>
          </div>

          <div className="mb-8 space-y-3">
            <p className="font-nunito text-[11px] font-semibold uppercase tracking-[0.2em] text-black/30">Quick access</p>
            {QUICK_LOGINS.map((q) => {
              const Icon = q.icon
              const isLogging = logging === q.role
              return (
                <button
                  key={q.role}
                  onClick={() => handleQuickLogin(q.role, q.email, q.password)}
                  disabled={logging !== null}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 text-left transition-all hover:border-brand-900/30 hover:shadow-sm disabled:opacity-50"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-nunito text-sm font-semibold text-black">{q.label}</div>
                    <div className="font-nunito text-xs text-black/40">{q.name}</div>
                  </div>
                  {isLogging ? (
                    <div className="size-5 animate-spin rounded-full border-2 border-brand-900 border-t-transparent" />
                  ) : (
                    <ArrowRight size={16} className="text-black/30 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="font-nunito bg-white px-3 text-black/30">or sign in manually</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="font-nunito mb-1 block text-xs font-semibold uppercase tracking-wider text-black/30">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="font-nunito mb-1 block text-xs font-semibold uppercase tracking-wider text-black/30">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={logging !== null}
              className="font-nunito w-full rounded-xl bg-brand-900 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-900/90 disabled:opacity-50"
            >
              {logging === "form" ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      <div className="hidden flex-col items-center justify-center bg-gradient-to-br from-brand-900 to-[#0d6e3f] p-16 text-white lg:flex lg:w-1/2">
        <Utensils size={56} className="mb-6 opacity-80" />
        <h1 className="font-playfair mb-4 text-center text-3xl font-medium">Welcome Back</h1>
        <p className="font-nunito max-w-sm text-center text-sm leading-relaxed text-white/60">
          Manage subscriptions, track deliveries, and keep your customers happy — all in one place.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
