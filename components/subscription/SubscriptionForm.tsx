"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChefHat, SlidersHorizontal, Check, ChevronDown, User, Mail, Phone, Search, X } from "lucide-react"
import { SUBSCRIPTION_PLANS, DELIVERY_DAYS } from "@/constants/subscriptions"
import { FloatingInput } from "@/components/ui/FloatingInput"
import { LocationPicker, type Coordinates } from "@/components/ui/LocationPicker"
import { resolveDeliveryAddress } from "@/utils/mapbox"

interface Ingredient { id: string; name: string }
interface GalleryRecipe {
  id: string
  name: string
  category: string | null
  image_path: string | null
  servings: { ingredients: { name: string }[] }[]
}

const CATS = ["beef", "chicken", "seafood", "salad", "wrap", "breakfast", "pasta", "soup", "pizza", "burgers", "desserts", "drinks", "biryani", "risotto", "smoothie", "juice", "beverages", "rice-sides", "platters", "vegetable"]

function sanitizeUaLocal(value: string) {
  let d = value.replace(/\D/g, "")
  if (d.startsWith("971")) d = d.slice(3)
  else if (d.startsWith("0971")) d = d.slice(4)
  else if (d.startsWith("0")) d = d.slice(1)
  return d.slice(0, 9)
}

export function SubscriptionForm() {
  const t = useTranslations("subscriptionForm")
  const tt = useTranslations("terms")
  const router = useRouter()
  const params = useSearchParams()
  const planId = params.get("plan")
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) ?? SUBSCRIPTION_PLANS[0]

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [address, setAddress] = useState("")
  const [mode, setMode] = useState<"normal" | "flexible">("normal")

  const [ingSearch, setIngSearch] = useState("")
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [ingLookup, setIngLookup] = useState<Record<string, string>>({})
  const [restricted, setRestricted] = useState<{ id: string; name: string }[]>([])

  const [mealSearch, setMealSearch] = useState("")
  const [category, setCategory] = useState("")
  const [meals, setMeals] = useState<GalleryRecipe[]>([])
  const [selectedMeals, setSelectedMeals] = useState<string[]>([])

  const [days, setDays] = useState<string[]>([])
  const [ingsExpanded, setIngsExpanded] = useState(false)
  const [slot, setSlot] = useState<"morning" | "evening">("morning")
  const [time, setTime] = useState("08:00")
  const [onCall, setOnCall] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [error, setError] = useState("")
  const [termsOpen, setTermsOpen] = useState(false)
  const [termsScrolled, setTermsScrolled] = useState(false)
  const termsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/ingredients?search=${encodeURIComponent(ingSearch)}&limit=30`)
        .then((r) => r.json())
        .then((d) => {
          const list = (d.data ?? []) as Ingredient[]
          setIngredients(list)
          setIngLookup((prev) => {
            const next = { ...prev }
            for (const ing of list) next[ing.id] = ing.name
            return next
          })
        })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [ingSearch])

  useEffect(() => {
    if (mode !== "flexible") return
    const t = setTimeout(() => {
      const q = new URLSearchParams({ limit: "24" })
      if (mealSearch.trim()) q.set("search", mealSearch.trim())
      if (category) q.set("category", category)
      fetch(`/api/recipe?${q.toString()}`)
        .then((r) => r.json())
        .then((d) => setMeals(d.data ?? []))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [mode, mealSearch, category])

  const restrictedNames = useMemo(() => {
    return new Set(restricted.map((r) => r.name.toLowerCase()).filter(Boolean))
  }, [restricted])

  function toggleRestriction(id: string, name: string) {
    setRestricted((p) => (p.some((r) => r.id === id) ? p.filter((r) => r.id !== id) : [...p, { id, name }]))
  }

  const visibleMeals = useMemo(() => {
    if (restrictedNames.size === 0) return meals
    return meals.filter((m) =>
      !(m.servings ?? []).some((s) =>
        (s.ingredients ?? []).some((ing) => restrictedNames.has(ing.name.toLowerCase())),
      ),
    )
  }, [meals, restrictedNames])

  function toggleDay(v: string) {
    setDays((p) => (p.includes(v) ? p.filter((d) => d !== v) : [...p, v]))
  }

  function validate() {
    setError("")
    if (!name.trim() || sanitizeUaLocal(mobile).length < 9 || !address) {
      setError("Please complete name, WhatsApp number and address.")
      return false
    }
    if (mode === "flexible" && selectedMeals.length === 0) {
      setError("Select at least one meal for a flexible plan.")
      return false
    }
    if (!onCall && days.length === 0) {
      setError("Select delivery days or choose on-call.")
      return false
    }
    return true
  }

  function openTerms() {
    if (!validate()) return
    setTermsScrolled(false)
    setTermsOpen(true)
    requestAnimationFrame(() => {
      const el = termsRef.current
      if (el && el.scrollHeight <= el.clientHeight + 20) setTermsScrolled(true)
    })
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/subscription-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: plan.id,
          name: name.trim(),
          email: email.trim() || null,
          mobile_number: `+971${sanitizeUaLocal(mobile)}`,
          address,
          location,
          mode,
          restrictions: restricted.map((r) => r.id),
          includedMeals: mode === "flexible" ? selectedMeals : [],
          days: onCall ? [] : days,
          slot: onCall ? null : slot,
          time: onCall ? null : time,
          onCall,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to submit")
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return <RedirectCountdown name={plan.name} countdown={countdown} setCountdown={setCountdown} router={router} />
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{plan.id}</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">{plan.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">{plan.description}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">Personal Information</h3>
        <FloatingInput label="Full Name" icon={<User size={13} />} required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex items-stretch gap-1.5">
          <span className="flex shrink-0 items-center gap-1 rounded-xl border border-neutral-200 px-2 text-xs font-semibold">
            <img src="/icons/uae-flag.png" alt="UAE" className="h-3 w-4 rounded-[2px] object-cover" /> +971
          </span>
          <div className="min-w-0 flex-1">
            <FloatingInput label="WhatsApp Number" icon={<Phone size={13} />} type="tel" required inputMode="numeric" maxLength={13} value={mobile} onChange={(e) => setMobile(sanitizeUaLocal(e.target.value))} />
          </div>
        </div>
        <FloatingInput label="Email" icon={<Mail size={13} />} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <LocationPicker value={location} onChange={(loc) => {
          setLocation(loc)
          if (loc) resolveDeliveryAddress(loc.lat, loc.lng).then((r) => setAddress(r.address)).catch(() => {})
        }} />
        {address && <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">{address}</p>}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">Plan mode</h3>
        <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup">
          {[
            { v: "normal" as const, icon: <ChefHat size={22} />, name: "Normal", desc: "Chef's choice" },
            { v: "flexible" as const, icon: <SlidersHorizontal size={22} />, name: "Flexible", desc: "Pick your meals" },
          ].map((o) => (
            <button
              key={o.v}
              role="radio"
              aria-checked={mode === o.v}
              onClick={() => setMode(o.v)}
              className={`flex flex-col items-center gap-1 rounded-2xl border p-5 transition-all ${mode === o.v ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
            >
              {o.icon}
              <span className="text-sm font-bold">{o.name}</span>
              <span className={`text-xs ${mode === o.v ? "text-white/60" : "text-neutral-400"}`}>{o.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">Ingredient restrictions</h3>
        <div className="relative mt-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={ingSearch} onChange={(e) => setIngSearch(e.target.value)} placeholder="Search ingredients..." className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-neutral-900" />
        </div>
        {restricted.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {restricted.map((r) => (
                <span key={r.id} className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-500 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
                  {r.name}
                  <button onClick={() => setRestricted((p) => p.filter((x) => x.id !== r.id))} aria-label="Remove restriction">
                    <X size={12} />
                  </button>
                </span>
              ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {ingredients.slice(0, 8).map((ing) => (
            <button
              key={ing.id}
              onClick={() => toggleRestriction(ing.id, ing.name)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${restricted.some((r) => r.id === ing.id) ? "border-red-500 bg-red-50 text-red-600" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
            >
              {ing.name}
            </button>
          ))}
          {ingredients.length > 8 && (
            <button
              onClick={() => setIngsExpanded((v) => !v)}
              aria-label={ingsExpanded ? "Collapse ingredients" : "Expand ingredients"}
              className="flex items-center justify-center rounded-full border border-neutral-200 px-2.5 py-1.5 text-neutral-600 transition-all hover:border-neutral-400"
            >
              <ChevronDown size={14} className={`transition-transform duration-300 ${ingsExpanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${ingsExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="flex flex-wrap gap-2 pt-1">
              {ingredients.slice(8).map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => toggleRestriction(ing.id, ing.name)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${restricted.some((r) => r.id === ing.id) ? "border-red-500 bg-red-50 text-red-600" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
                >
                  {ing.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${mode === "flexible" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h3 className="text-sm font-bold text-neutral-900">Choose meals ({selectedMeals.length})</h3>
            <div className="relative mt-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={mealSearch} onChange={(e) => setMealSearch(e.target.value)} placeholder="Search menu..." className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-neutral-900" />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setCategory("")}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${category === "" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
              >
                All
              </button>
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(category === c ? "" : c)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all ${category === c ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleMeals.map((m) => {
                const active = selectedMeals.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMeals((p) => (active ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                    className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-cover bg-center text-left ${active ? "ring-2 ring-neutral-900" : "opacity-85 hover:opacity-100"}`}
                    style={m.image_path ? { backgroundImage: `url(${m.image_path})` } : undefined}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    {active && <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-white text-neutral-900"><Check size={12} /></span>}
                    <span className="absolute bottom-0 left-0 right-0 truncate p-2 text-xs font-semibold text-white">{m.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">Delivery preference</h3>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={onCall} onChange={(e) => setOnCall(e.target.checked)} className="size-4 accent-neutral-900" />
          On-call delivery only
        </label>
        {!onCall && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {DELIVERY_DAYS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => toggleDay(d.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${days.includes(d.value) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {(["morning", "evening"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition-all ${slot === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 hover:border-neutral-400"}`}
                >
                  {s}
                </button>
              ))}
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </div>
          </>
        )}
      </div>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      <button
        onClick={openTerms}
        disabled={submitting}
        className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-40"
      >
        {submitting ? "Submitting..." : "Submit inquiry"}
      </button>

      {termsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setTermsOpen(false)}>
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-neutral-100 p-5">
              <h2 className="text-lg font-bold text-neutral-900">{tt("title")}</h2>
              <p className="mt-1 text-xs text-neutral-500">{t("termsHint")}</p>
            </div>
            <div
              ref={termsRef}
              onScroll={(e) => {
                const el = e.currentTarget
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setTermsScrolled(true)
              }}
              className="flex-1 space-y-4 overflow-y-auto p-5 text-sm leading-relaxed text-neutral-600"
            >
              <p>{tt("intro")}</p>
              {(tt.raw("sections") as { title: string; items?: { term?: string; desc: string }[]; clauses?: string[] }[]).map((s) => (
                <div key={s.title}>
                  <h3 className="font-bold text-neutral-900">{s.title}</h3>
                  {s.items?.map((it) => (
                    <p key={it.desc} className="mt-1">{it.term ? <strong>{it.term} — </strong> : null}{it.desc}</p>
                  ))}
                  {s.clauses?.map((c, i) => (
                    <p key={i} className="mt-1">{i + 1}. {c}</p>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-neutral-100 p-4">
              <button onClick={() => setTermsOpen(false)} className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">
                {t("cancel")}
              </button>
              <button
                disabled={!termsScrolled || submitting}
                onClick={() => {
                  setTermsOpen(false)
                  void handleSubmit()
                }}
                className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("agreeProceed")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RedirectCountdown({
  name,
  countdown,
  setCountdown,
  router,
}: {
  name: string
  countdown: number
  setCountdown: (n: number | ((p: number) => number)) => void
  router: { push: (href: string) => void }
}) {
  useEffect(() => {
    if (countdown <= 0) {
      router.push("/")
      return
    }
    const id = setTimeout(() => setCountdown((c: number) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown, router, setCountdown])

  const R = 26
  const C = 2 * Math.PI * R

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check size={24} />
      </div>
      <h2 className="mt-4 text-xl font-bold text-neutral-900">Inquiry received</h2>
      <p className="mt-2 text-sm text-neutral-500">Our team will contact you about the {name} shortly.</p>
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="relative size-16">
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-neutral-200" />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className="stroke-neutral-900 transition-all duration-1000 ease-linear"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - countdown / 5)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-neutral-900">{countdown}</span>
        </div>
        <p className="text-xs text-neutral-400">Redirecting to home...</p>
      </div>
    </div>
  )
}
