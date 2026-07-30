"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/AuthProvider"

const inputClass =
  "font-nunito w-full rounded-lg border border-black/10 bg-transparent px-3 py-3 text-sm text-black outline-none transition-colors placeholder:text-black/20 focus:border-black"

function LoginForm() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [logging, setLogging] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLogging("form")
    try {
      const role = await signIn(email, password)
      router.push(`/${role}`)
    } catch (e) {
      console.error("[LOGIN] Manual login error:", e)
      setError(e instanceof Error ? e.message : "Invalid email or password.")
      setLogging(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center bg-white px-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="mb-10">
              <div className="mb-6 flex justify-center">
                <img src="/logo-horizontal.png" alt="CookConnect" className="h-14 object-contain opacity-90" />
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
              {error && (
                <p className="font-nunito text-xs text-red-500">{error}</p>
              )}
              <button
                type="submit"
                disabled={logging !== null}
                className="font-nunito w-full rounded-xl bg-brand-900 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-900/90 disabled:opacity-50"
              >
                {logging === "form" ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="font-nunito mt-8 text-center text-sm text-black">
              Don&apos;t have an account?{" "}
              <a href="/#contact" className="font-semibold underline underline-offset-2 transition-colors hover:text-brand-900">
                Contact your restaurant administrator.
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
