"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { motion, useReducedMotion } from "framer-motion"
import { Link } from "@/i18n/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  ChevronDown,
  Croissant,
  Mail,
  Phone,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react"
import { SUBSCRIPTION_PLANS, DELIVERY_DAYS } from "@/constants/subscriptions"
import { FloatingInput } from "@/components/ui/FloatingInput"
import { LocationPicker, type Coordinates } from "@/components/ui/LocationPicker"
import { imageVariant } from "@/lib/images"
import { resolveDeliveryAddress } from "@/utils/mapbox"

interface Ingredient { id: string; name: string }
interface GalleryServing {
  calories: number | null
  nutrition: {
    protein_g?: number
    carbs_g?: number
    fats_g?: number
  } | null
  ingredients: { name: string }[]
}
interface GalleryRecipe {
  id: string
  name: string
  category: string | null
  image_path: string | null
  servings: GalleryServing[]
}

type StepId = "plan" | "details" | "preferences" | "meals" | "delivery" | "review"

type InviteState =
  | { status: "none" }
  | { status: "checking" }
  | {
      status: "valid"
      plan: string
      expiresAt: string
      agreedPriceCents?: number
      basePriceCents?: number
      concession?: string
      currency?: string
      mealsPerDay?: number
    }
  | { status: "invalid"; message: string }

const STEP_DEFS: { id: StepId; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "details", label: "Details" },
  { id: "preferences", label: "Preferences" },
  { id: "meals", label: "Meals" },
  { id: "delivery", label: "Delivery" },
  { id: "review", label: "Review" },
]

const CATS = ["beef", "chicken", "seafood", "salad", "wrap", "breakfast", "pasta", "soup", "pizza", "burgers", "desserts", "drinks", "biryani", "risotto", "smoothie", "juice", "beverages", "rice-sides", "platters", "vegetable"]

function sanitizeUaLocal(value: string) {
  let d = value.replace(/\D/g, "")
  if (d.startsWith("971")) d = d.slice(3)
  else if (d.startsWith("0971")) d = d.slice(4)
  else if (d.startsWith("0")) d = d.slice(1)
  return d.slice(0, 9)
}

export function SubscriptionForm({
  staffMode = false,
  onCreated,
}: {
  staffMode?: boolean
  onCreated?: () => void
} = {}) {
  const t = useTranslations("subscriptionForm")
  const tt = useTranslations("terms")
  const router = useRouter()
  const params = useSearchParams()
  const planParam = params.get("plan")
  const tokenParam = params.get("token")

  const [staffPlanId, setStaffPlanId] = useState(SUBSCRIPTION_PLANS[0].id)
  const [invite, setInvite] = useState<InviteState>(() =>
    staffMode || !tokenParam ? { status: "none" } : { status: "checking" },
  )

  const [stepId, setStepId] = useState<StepId>("plan")
  const [customerId, setCustomerId] = useState("")
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [address, setAddress] = useState("")
  const [mode, setMode] = useState<"normal" | "flexible">("normal")

  const [ingSearch, setIngSearch] = useState("")
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [restricted, setRestricted] = useState<{ id: string; name: string }[]>([])

  const [mealSearch, setMealSearch] = useState("")
  const [category, setCategory] = useState("")
  const [meals, setMeals] = useState<GalleryRecipe[]>([])
  const [mealLookup, setMealLookup] = useState<Record<string, string>>({})
  const [selectedMeals, setSelectedMeals] = useState<string[]>([])

  const [days, setDays] = useState<string[]>([])
  const [mealsPerDay, setMealsPerDay] = useState(1)
  const [breakfast, setBreakfast] = useState(false)
  const [ingsExpanded, setIngsExpanded] = useState(false)
  const [slots, setSlots] = useState<("morning" | "noon" | "evening")[]>(["morning"])
  const [onCall, setOnCall] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [error, setError] = useState("")
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [activeStepHeight, setActiveStepHeight] = useState<number | null>(null)
  const [termsOpen, setTermsOpen] = useState(false)
  const [termsScrolled, setTermsScrolled] = useState(false)
  const termsRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const stepIds = useMemo(
    () => STEP_DEFS.filter((step) => step.id !== "meals" || mode === "flexible").map((step) => step.id),
    [mode],
  )
  const currentStepId = stepIds.includes(stepId) ? stepId : stepIds[0]
  const currentIndex = Math.max(0, stepIds.indexOf(currentStepId))
  const currentStep = STEP_DEFS.find((step) => step.id === currentStepId) ?? STEP_DEFS[0]

  const planId = staffMode
    ? staffPlanId
    : invite.status === "valid"
      ? invite.plan
      : planParam
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) ?? SUBSCRIPTION_PLANS[0]
  const agreedPriceLabel =
    !staffMode && invite.status === "valid" && typeof invite.agreedPriceCents === "number"
      ? `${invite.currency ?? "AED"} ${(invite.agreedPriceCents / 100).toFixed(2)}`
      : null

  useEffect(() => {
    if (staffMode || !tokenParam) return
    const controller = new AbortController()
    const query = new URLSearchParams({ token: tokenParam })
    if (planParam) query.set("plan", planParam)

    fetch(`/api/subscription-invites/validate?${query.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean
          plan?: string
          expiresAt?: string
          agreedPriceCents?: number
          basePriceCents?: number
          concession?: string
          currency?: string
          mealsPerDay?: number
          error?: string
        }
        if (!res.ok || !data.valid || !data.plan || !data.expiresAt) {
          throw new Error(data.error ?? "This invitation link is invalid")
        }
        setInvite({
          status: "valid",
          plan: data.plan,
          expiresAt: data.expiresAt,
          ...(typeof data.agreedPriceCents === "number" ? { agreedPriceCents: data.agreedPriceCents } : {}),
          ...(typeof data.basePriceCents === "number" ? { basePriceCents: data.basePriceCents } : {}),
          ...(typeof data.concession === "string" ? { concession: data.concession } : {}),
          ...(typeof data.currency === "string" ? { currency: data.currency } : {}),
          ...(typeof data.mealsPerDay === "number" ? { mealsPerDay: data.mealsPerDay } : {}),
        })
        if (typeof data.mealsPerDay === "number") {
          setMealsPerDay(Math.min(5, Math.max(1, data.mealsPerDay)))
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return
        setInvite({ status: "invalid", message: err instanceof Error ? err.message : "This invitation link is invalid" })
      })

    return () => controller.abort()
  }, [staffMode, tokenParam, planParam])

  useEffect(() => {
    const active = trackRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    if (!active || typeof ResizeObserver === "undefined") return
    const update = () => setActiveStepHeight(active.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(active)
    return () => observer.disconnect()
  }, [currentIndex, mode])

  useEffect(() => {
    if (!staffMode) return
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(((d ?? []) as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {})
  }, [staffMode])

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/ingredients?search=${encodeURIComponent(ingSearch)}&limit=30`)
        .then((r) => r.json())
        .then((d) => {
          const list = (d.data ?? []) as Ingredient[]
          setIngredients(list)
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
      q.set("include", "ingredients")
      fetch(`/api/recipe?${q.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          const list = (d.data ?? []) as GalleryRecipe[]
          setMeals(list)
          setMealLookup((prev) => {
            const next = { ...prev }
            for (const meal of list) next[meal.id] = meal.name
            return next
          })
        })
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

  function toggleSlot(v: "morning" | "noon" | "evening") {
    setSlots((p) => (p.includes(v) ? p.filter((s) => s !== v) : [...p, v]))
  }

  function scrollToTop() {
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  function validateStep(id: StepId): string | null {
    if (id === "details") {
      if (staffMode && !customerId) return "Please select a customer."
      if (!name.trim() || sanitizeUaLocal(mobile).length < 9 || !address) {
        return "Please complete name, WhatsApp number and address."
      }
    }
    if (id === "meals" && mode === "flexible" && selectedMeals.length === 0) {
      return "Select at least one meal for a flexible plan."
    }
    if (id === "delivery") {
      if (!onCall && days.length === 0) return "Select delivery days or choose on-call."
      if (!onCall && slots.length === 0) return "Select at least one delivery slot."
    }
    if (id === "review" && !acceptedLegal) {
      return "Please accept the Terms of Service and Privacy Policy to continue."
    }
    return null
  }

  function validateAll() {
    for (const id of stepIds) {
      const message = validateStep(id)
      if (message) {
        setStepId(id)
        setError(message)
        scrollToTop()
        return false
      }
    }
    setError("")
    return true
  }

  function goToStep(target: StepId) {
    const targetIndex = stepIds.indexOf(target)
    if (targetIndex < 0 || targetIndex > currentIndex) return
    setError("")
    setStepId(target)
    scrollToTop()
  }

  function goBack() {
    if (currentIndex === 0) return
    goToStep(stepIds[currentIndex - 1])
  }

  function goNext() {
    const message = validateStep(currentStepId)
    if (message) {
      setError(message)
      return
    }
    setError("")
    if (currentIndex < stepIds.length - 1) {
      setStepId(stepIds[currentIndex + 1])
      scrollToTop()
    }
  }

  function openTerms() {
    if (!validateAll()) return
    setTermsScrolled(false)
    setTermsOpen(true)
    requestAnimationFrame(() => {
      const el = termsRef.current
      if (el && el.scrollHeight <= el.clientHeight + 20) setTermsScrolled(true)
    })
  }

  async function handleSubmit() {
    if (!validateAll()) return
    setSubmitting(true)
    try {
      if (staffMode) {
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: customerId,
            details: {
              planId: plan.id,
              planName: plan.name,
              planType: plan.type,
              durationDays: plan.durationDays,
              name: name.trim(),
              email: email.trim() || null,
              mobile_number: `+971${sanitizeUaLocal(mobile)}`,
              address,
              location,
              mode,
              restrictions: restricted.map((r) => r.id),
              restrictionNames: Object.fromEntries(restricted.map((r) => [r.id, r.name])),
              mealsPerDay,
              breakfast,
              includedMeals: mode === "flexible" ? selectedMeals : [],
              days: onCall ? [] : days,
              slots: onCall ? [] : slots,
              onCall,
              paymentStatus: "pending",
            },
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? "Failed to submit")
        }
        onCreated?.()
        return
      }
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
          restrictionNames: Object.fromEntries(restricted.map((r) => [r.id, r.name])),
          mealsPerDay,
          breakfast,
          includedMeals: mode === "flexible" ? selectedMeals : [],
          days: onCall ? [] : days,
          slots: onCall ? [] : slots,
          onCall,
          invite_token: tokenParam ?? undefined,
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

  if (!staffMode && invite.status === "checking") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-brand-700/40 bg-white p-8 text-center shadow-[0_24px_70px_-32px_rgba(17,139,80,0.35)]">
        <motion.div
          animate={reduceMotion ? undefined : { rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-lg shadow-brand-900/25"
        >
          <ChefHat size={24} />
        </motion.div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">Checking your invitation</h2>
        <p className="mt-2 text-sm text-neutral-500">One moment while we validate your link.</p>
        <div className="mx-auto mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-brand-700/40">
          <motion.div
            className="h-full w-1/2 rounded-full bg-brand-900"
            animate={reduceMotion ? undefined : { x: ["-100%", "200%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    )
  }

  if (!staffMode && invite.status === "invalid") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-[0_24px_70px_-32px_rgba(239,68,68,0.25)]">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.8, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"
        >
          <X size={24} />
        </motion.div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">Invitation not valid</h2>
        <p className="mt-2 text-sm text-neutral-500">{invite.message}</p>
        <p className="mt-1 text-sm text-neutral-400">Please contact our team for a new invitation link.</p>
      </div>
    )
  }

  const selectedMealNames = selectedMeals.map((id) => mealLookup[id] ?? id)
  const restrictionNamesList = restricted.map((r) => r.name)
  const deliveryLabel = onCall
    ? "On-call only"
    : `${days.length > 0 ? days.join(", ") : "No days selected"} · ${slots.length > 0 ? slots.join(", ") : "No slots selected"}`

  return (
    <div className="mx-auto max-w-2xl">
      <div ref={topRef} className="scroll-mt-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="text-center sm:text-left"
        >
          <h1 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-4xl">
            Let&apos;s set up your <span className="text-brand-900">meal plan</span>
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-900">Subscription onboarding</p>
          <p className="mt-2 text-sm text-neutral-500">
            {stepIds.length} short steps. You can go back at any time.
          </p>
        </motion.div>

        <StepProgress steps={STEP_DEFS.filter((step) => stepIds.includes(step.id))} currentIndex={currentIndex} onSelect={goToStep} />

        {!staffMode && invite.status === "valid" && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-2 rounded-xl border border-brand-700/60 bg-brand-700/20 px-4 py-3 text-sm text-brand-900 shadow-sm"
          >
            <Check size={16} className="mt-0.5 shrink-0 text-brand-900" />
            <span>
              Invitation verified for {plan.name}. Valid until{" "}
              {new Date(invite.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}.
            </span>
          </motion.div>
        )}

        <div className="mt-5 rounded-3xl border border-brand-700/40 bg-white p-5 shadow-[0_24px_70px_-32px_rgba(17,139,80,0.3)] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900">
                Step {currentIndex + 1} of {stepIds.length}
              </p>
              <h2 className="mt-1 text-lg font-bold text-neutral-900">{currentStep.label}</h2>
            </div>
            {currentStepId !== "plan" && (
              <button
                type="button"
                onClick={() => goToStep("plan")}
                className="hidden rounded-full border border-brand-700/60 bg-brand-700/20 px-3 py-1.5 text-xs font-semibold text-brand-900 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-700/20 hover:shadow-sm sm:block"
              >
                {plan.name}
              </button>
            )}
          </div>

          <div
            ref={trackRef}
            className="relative mt-5 min-h-[240px] overflow-hidden"
            style={activeStepHeight === null ? undefined : { height: activeStepHeight }}
          >
            {stepIds.includes("plan") && (
              <StepCard index={stepIds.indexOf("plan")} currentIndex={currentIndex}>
              <div>
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-lg shadow-brand-900/25">
                    <ChefHat size={24} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900">
                        {plan.durationDays}-day plan
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-neutral-900">{plan.name}</h3>
                      <p className="mt-1 text-sm text-neutral-500">{plan.description}</p>
                    </div>
                    {agreedPriceLabel && (
                      <p className="shrink-0 self-end text-lg font-bold text-neutral-900 sm:self-start">{agreedPriceLabel}</p>
                    )}
                  </div>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm text-neutral-700">
                      <Check size={15} className="shrink-0 text-brand-900" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {staffMode && (
                  <div className="mt-5 border-t border-brand-700/40 pt-5">
                    <h3 className="text-sm font-bold text-neutral-900">Change plan</h3>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {SUBSCRIPTION_PLANS.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setStaffPlanId(p.id)}
                          className={`rounded-2xl border p-3 text-left transition-all ${
                            plan.id === p.id
                              ? "border-brand-900 bg-brand-900 text-white shadow-md shadow-brand-900/20"
                              : "border-brand-700/40 hover:border-brand-400 hover:bg-brand-700/20"
                          }`}
                        >
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className={`mt-0.5 text-xs ${plan.id === p.id ? "text-white/70" : "text-neutral-400"}`}>{p.durationDays} Days</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </StepCard>
            )}

            {stepIds.includes("details") && (
              <StepCard index={stepIds.indexOf("details")} currentIndex={currentIndex}>
              <div className="space-y-4">
                {staffMode && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-brand-900">Customer</label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full rounded-xl border border-brand-700/40 bg-brand-700/20 px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-900"
                    >
                      <option value="">Select customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <FloatingInput label="Full Name" icon={<User size={13} />} required value={name} onChange={(e) => setName(e.target.value)} />
                <div className="flex items-stretch gap-1.5">
                  <span className="flex shrink-0 items-center gap-1 rounded-xl border border-brand-700/40 bg-brand-700/20 px-2 text-xs font-semibold">
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
                {address && (
                  <p className="rounded-xl border border-brand-700/40 bg-brand-700/20 px-4 py-3 text-sm text-brand-900">
                    {address}
                  </p>
                )}
              </div>
              </StepCard>
            )}

            {stepIds.includes("preferences") && (
              <StepCard index={stepIds.indexOf("preferences")} currentIndex={currentIndex}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">How would you like your meals?</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 overflow-visible" role="radiogroup">
                    {[
                      { v: "normal" as const, icon: <ChefHat size={22} />, name: "Normal", desc: "Chef's choice" },
                      { v: "flexible" as const, icon: <SlidersHorizontal size={22} />, name: "Flexible", desc: "Pick your meals" },
                    ].map((o) => (
                      <button
                        type="button"
                        key={o.v}
                        role="radio"
                        aria-checked={mode === o.v}
                        onClick={(e) => {
                          setMode(o.v)
                          e.currentTarget.animate(
                            [
                              { transform: "translateY(0) scale(1)" },
                              { transform: "translateY(-6px) scale(1.04)", offset: 0.35 },
                              { transform: "translateY(2px) scale(0.98)", offset: 0.7 },
                              { transform: "translateY(0) scale(1)" },
                            ],
                            { duration: 420, easing: "ease-out" },
                          )
                        }}
                        className={`relative overflow-hidden rounded-2xl border p-5 transition-[border-color,color,box-shadow,transform] duration-300 ease-out ${
                          mode === o.v
                            ? "border-brand-900 text-white shadow-[4px_6px_16px_rgba(21,13,11,0.14)]"
                            : "border-brand-700/40 text-neutral-600 shadow-[4px_6px_16px_rgba(21,13,11,0.1)] hover:border-brand-400 hover:bg-brand-700/10"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-900 transition-transform duration-300 ease-out ${
                            mode === o.v ? "scale-100" : "scale-0"
                          }`}
                        />
                        <span className="relative z-10 flex flex-col items-center gap-1">
                          {o.icon}
                          <span className="text-sm font-bold">{o.name}</span>
                          <span className={`text-xs transition-colors duration-300 ${mode === o.v ? "text-white/70" : "text-neutral-400"}`}>{o.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p aria-live="polite" className="mt-4 text-xs text-neutral-500">
                    {mode === "normal"
                      ? "Our chefs plan your meals from the full menu."
                      : "You choose the meals included in your rotation."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBreakfast((v) => !v)}
                  aria-pressed={breakfast}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.99] ${breakfast ? "border-brand-900 bg-brand-900 text-white shadow-lg shadow-brand-900/20" : "border-brand-700/40 text-neutral-600 hover:border-brand-400 hover:bg-brand-700/20"}`}
                >
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${breakfast ? "bg-white/15 text-white" : "bg-brand-700/20 text-brand-900"}`}>
                    <Croissant size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">Add breakfast</span>
                    <span className={`mt-0.5 block text-xs ${breakfast ? "text-white/70" : "text-neutral-400"}`}>Served daily — not counted in your meals per day</span>
                  </span>
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-all ${breakfast ? "border-white bg-white text-brand-900" : "border-brand-700/60 text-transparent"}`}>
                    <Check size={14} />
                  </span>
                </button>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Ingredient restrictions</h3>
                  <p className="mt-0.5 text-xs text-neutral-400">Optional — choose anything you cannot eat.</p>
                  <div className="relative mt-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-900" />
                    <input value={ingSearch} onChange={(e) => setIngSearch(e.target.value)} placeholder="Search ingredients..." className="w-full rounded-xl border border-brand-700/40 bg-brand-700/20 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-900 focus:bg-white" />
                  </div>
                  {restricted.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {restricted.map((r) => (
                        <span key={r.id} className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-400 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
                          {r.name}
                          <button type="button" onClick={() => setRestricted((p) => p.filter((x) => x.id !== r.id))} aria-label="Remove restriction">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ingredients.slice(0, 8).map((ing) => (
                      <button
                        type="button"
                        key={ing.id}
                        onClick={() => toggleRestriction(ing.id, ing.name)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${restricted.some((r) => r.id === ing.id) ? "border-red-400 bg-red-50 text-red-600" : "border-brand-700/40 text-neutral-600 hover:border-brand-400 hover:bg-brand-700/20"}`}
                      >
                        {ing.name}
                      </button>
                    ))}
                    {ingredients.length > 8 && (
                      <button
                        type="button"
                        onClick={() => setIngsExpanded((v) => !v)}
                        aria-label={ingsExpanded ? "Collapse ingredients" : "Expand ingredients"}
                        className="flex items-center justify-center rounded-full border border-brand-700/40 px-2.5 py-1.5 text-brand-900 transition-all hover:border-brand-400 hover:bg-brand-700/20"
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
                            type="button"
                            key={ing.id}
                            onClick={() => toggleRestriction(ing.id, ing.name)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${restricted.some((r) => r.id === ing.id) ? "border-red-400 bg-red-50 text-red-600" : "border-brand-700/40 text-neutral-600 hover:border-brand-400 hover:bg-brand-700/20"}`}
                          >
                            {ing.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </StepCard>
            )}

            {stepIds.includes("meals") && (
              <StepCard index={stepIds.indexOf("meals")} currentIndex={currentIndex}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">Choose meals</h3>
                  <span className="rounded-full bg-brand-700/40 px-2 py-0.5 text-[11px] font-bold text-brand-900">
                    {selectedMeals.length} selected
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-400">Pick the dishes you would like in your rotation.</p>
                <div className="relative mt-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-900" />
                  <input value={mealSearch} onChange={(e) => setMealSearch(e.target.value)} placeholder="Search menu..." className="w-full rounded-xl border border-brand-700/40 bg-brand-700/20 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-900 focus:bg-white" />
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setCategory("")}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${category === "" ? "border-brand-900 bg-brand-900 text-white shadow-sm" : "border-brand-700/40 text-neutral-600 hover:border-brand-400 hover:bg-brand-700/20"}`}
                  >
                    All
                  </button>
                  {CATS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCategory(category === c ? "" : c)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all ${category === c ? "border-brand-900 bg-brand-900 text-white shadow-sm" : "border-brand-700/40 text-neutral-600 hover:border-brand-400 hover:bg-brand-700/20"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {visibleMeals.map((m) => {
                    const active = selectedMeals.includes(m.id)
                    const serving = m.servings?.[0]
                    const micros = [
                      serving?.calories != null ? `${Math.round(serving.calories)} kcal` : null,
                      serving?.nutrition?.protein_g != null ? `P ${Math.round(serving.nutrition.protein_g)}g` : null,
                      serving?.nutrition?.carbs_g != null ? `C ${Math.round(serving.nutrition.carbs_g)}g` : null,
                      serving?.nutrition?.fats_g != null ? `F ${Math.round(serving.nutrition.fats_g)}g` : null,
                    ].filter((micro): micro is string => Boolean(micro))
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setSelectedMeals((p) => (active ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                        className="group flex w-full flex-col text-left active:scale-[0.99]"
                      >
                        <span className="relative block aspect-[4/3] w-full overflow-hidden">
                          {m.image_path && (
                            <img
                              src={imageVariant(m.image_path, 600)}
                              alt={m.name}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-contain"
                            />
                          )}
                          {active && (
                            <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-900 text-white shadow">
                              <Check size={12} />
                            </span>
                          )}
                        </span>
                        <span className="pt-2">
                          <span className={`block truncate text-sm font-semibold ${active ? "text-brand-900" : "text-neutral-900"}`}>{m.name}</span>
                          <span className="mt-0.5 block text-[10px] font-medium leading-relaxed text-neutral-500">
                            {micros.length > 0 ? micros.join(" · ") : m.category ?? "Menu item"}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              </StepCard>
            )}

            {stepIds.includes("delivery") && (
              <StepCard index={stepIds.indexOf("delivery")} currentIndex={currentIndex}>
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Meals per day</h3>
                    <p className="mt-0.5 text-xs text-neutral-400">Maximum 5 meals per day.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-brand-700/40 bg-brand-700/20 p-1">
                    <button
                      type="button"
                      onClick={() => setMealsPerDay((v) => Math.max(1, v - 1))}
                      className="flex size-8 items-center justify-center rounded-full border border-brand-700/60 bg-white text-brand-900 transition-all hover:bg-brand-700/40 active:scale-90"
                      aria-label="Decrease meals per day"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-brand-900">
                      {mealsPerDay}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMealsPerDay((v) => Math.min(5, v + 1))}
                      className="flex size-8 items-center justify-center rounded-full border border-brand-700/60 bg-white text-brand-900 transition-all hover:bg-brand-700/40 active:scale-90"
                      aria-label="Increase meals per day"
                    >
                      +
                    </button>
                  </div>
                </div>

                <label className="mt-5 flex cursor-pointer items-center gap-2 rounded-xl border border-brand-700/40 bg-brand-700/20 px-3 py-2.5 text-sm font-medium text-brand-900 transition-colors hover:bg-brand-700/20">
                  <input type="checkbox" checked={onCall} onChange={(e) => setOnCall(e.target.checked)} className="size-4 accent-brand-900" />
                  On-call delivery only
                </label>

                {!onCall && (
                  <div>
                    <div className="mt-5">
                      <h3 className="text-sm font-bold text-neutral-900">Delivery days</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DELIVERY_DAYS.map((d) => (
                          <button
                            type="button"
                            key={d.value}
                            onClick={() => toggleDay(d.value)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${days.includes(d.value) ? "border-brand-900 bg-brand-900 text-white shadow-sm shadow-brand-900/20" : "border-brand-700/40 text-neutral-600 hover:border-brand-400 hover:bg-brand-700/20"}`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5">
                      <h3 className="text-sm font-bold text-neutral-900">Delivery slots</h3>
                      <div className="mt-2 flex gap-2">
                        {(["morning", "noon", "evening"] as const).map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => toggleSlot(s)}
                            aria-pressed={slots.includes(s)}
                            className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition-all active:scale-[0.97] ${slots.includes(s) ? "border-brand-900 bg-brand-900 text-white shadow-md shadow-brand-900/15" : "border-brand-700/40 text-neutral-600 hover:border-brand-400 hover:bg-brand-700/20"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </StepCard>
            )}

            {stepIds.includes("review") && (
              <StepCard index={stepIds.indexOf("review")} currentIndex={currentIndex}>
              <div className="space-y-3">
                <p className="text-sm text-neutral-500">Check everything below before accepting the service agreement.</p>
                <div className="divide-y divide-brand-700/40 overflow-hidden rounded-2xl border border-brand-700/40 bg-white">
                  <SummaryRow label="Plan" value={`${plan.name} · ${plan.durationDays} days`} onEdit={() => goToStep("plan")} />
                  {agreedPriceLabel && <SummaryRow label="Price" value={agreedPriceLabel} onEdit={() => goToStep("plan")} />}
                  <SummaryRow label="Name" value={name} onEdit={() => goToStep("details")} />
                  <SummaryRow label="WhatsApp" value={`+971 ${sanitizeUaLocal(mobile)}`} onEdit={() => goToStep("details")} />
                  <SummaryRow label="Email" value={email || "Not provided"} onEdit={() => goToStep("details")} />
                  <SummaryRow label="Address" value={address || "Not selected"} onEdit={() => goToStep("details")} />
                  <SummaryRow label="Style" value={mode === "flexible" ? "Flexible — pick your meals" : "Normal — chef's choice"} onEdit={() => goToStep("preferences")} />
                  <SummaryRow label="Breakfast" value={breakfast ? "Included" : "Not included"} onEdit={() => goToStep("preferences")} />
                  <SummaryRow label="Restrictions" value={restrictionNamesList.length > 0 ? restrictionNamesList.join(", ") : "None"} onEdit={() => goToStep("preferences")} />
                  {mode === "flexible" && (
                    <SummaryRow label="Meals" value={selectedMealNames.length > 0 ? selectedMealNames.join(", ") : "None selected"} onEdit={() => goToStep("meals")} />
                  )}
                  <SummaryRow label="Meals per day" value={String(mealsPerDay)} onEdit={() => goToStep("delivery")} />
                  <SummaryRow label="Delivery" value={deliveryLabel} onEdit={() => goToStep("delivery")} />
                </div>

                <label className="flex cursor-pointer items-start gap-3 text-xs sm:text-sm">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-brand-900"
                  />
                  <span className="text-neutral-600">
                    By proceeding, I agree to the{" "}
                    <Link href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-brand-900 underline underline-offset-2">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-brand-900 underline underline-offset-2">
                      Privacy Policy
                    </Link>
                    , and I consent to Cook Connect collecting and processing my personal data to fulfil this subscription.
                  </span>
                </label>
              </div>
              </StepCard>
            )}
          </div>

          {error && (
            <p
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {currentIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-xl border border-brand-700/60 bg-white px-4 py-3 text-sm font-semibold text-brand-900 transition-all hover:-translate-x-0.5 hover:bg-brand-700/20 active:scale-[0.98] disabled:opacity-40"
              >
                <ArrowLeft size={15} />
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={currentStepId === "review" ? openTerms : goNext}
              disabled={submitting || (currentStepId === "review" && !acceptedLegal)}
              className="group flex items-center gap-1.5 rounded-xl bg-brand-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-900/20 transition-all hover:-translate-y-0.5 hover:bg-brand-900/90 hover:shadow-xl hover:shadow-brand-900/25 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
            >
              {currentStepId === "review" ? "Review terms & submit" : "Next"}
              {currentStepId !== "review" && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </div>
        </div>
      </div>

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
            <div className="flex gap-2 border-t border-brand-700/40 p-4">
              <button type="button" onClick={() => setTermsOpen(false)} className="flex-1 rounded-xl border border-brand-700/60 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-700/20">
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={!termsScrolled || submitting}
                onClick={() => {
                  setTermsOpen(false)
                  void handleSubmit()
                }}
                className="flex-1 rounded-xl bg-brand-900 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-900/15 transition-all hover:bg-brand-900/90 hover:shadow-lg hover:shadow-brand-900/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {submitting ? "Submitting..." : t("agreeProceed")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StepProgress({
  steps,
  currentIndex,
  onSelect,
}: {
  steps: { id: StepId; label: string }[]
  currentIndex: number
  onSelect: (id: StepId) => void
}) {
  return (
    <>
      <div className="mt-5 flex w-full items-center gap-1 overflow-visible pb-1 sm:hidden" aria-label="Onboarding progress">
        {steps.map((step, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <div key={step.id} className="contents">
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                disabled={i > currentIndex}
                aria-label={step.label}
                aria-current={active ? "step" : undefined}
                className={`flex shrink-0 items-center justify-center rounded-full border font-bold transition-all duration-300 ease-out active:scale-90 disabled:cursor-default ${
                  done
                    ? "size-5 border-brand-900 bg-brand-900 text-white"
                    : active
                      ? "size-8 border-brand-900 bg-white text-xs text-brand-900 shadow-sm shadow-brand-900/20"
                      : "size-6 border-brand-700/40 bg-white text-xs text-neutral-400"
                }`}
              >
                {done ? <Check size={10} /> : i + 1}
              </button>
              {active && (
                <span className="whitespace-nowrap text-base font-bold text-brand-900">
                  {step.label}
                </span>
              )}
              {i < steps.length - 1 && (
                <span
                  className={`h-px transition-all duration-300 ease-out ${
                    i < currentIndex
                      ? "w-3 shrink-0 bg-brand-900"
                      : "min-w-2 flex-1 bg-brand-700/40"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      <ol className="mt-5 hidden items-center gap-1 overflow-visible pb-1 sm:flex" aria-label="Onboarding progress">
      {steps.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              disabled={i > currentIndex}
              aria-label={step.label}
              aria-current={active ? "step" : undefined}
              className={`flex min-w-0 items-center transition-all duration-300 ease-out active:scale-95 disabled:cursor-default ${done ? "gap-0" : "gap-1.5"}`}
            >
              <span
                className={`relative flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  done
                    ? "border-brand-900 bg-brand-900 text-white shadow-sm shadow-brand-900/25"
                    : active
                      ? "border-brand-900 bg-white text-brand-900"
                      : "border-brand-700/40 bg-white text-neutral-400"
                }`}
              >
                {active && <span className="absolute inset-0 animate-ping rounded-full border border-brand-400/50" />}
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span
                aria-hidden={done}
                className={`hidden overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 ease-out sm:block ${
                  done
                    ? "max-w-0 -translate-x-1 text-xs opacity-0"
                    : active
                      ? "max-w-28 translate-x-0 text-sm text-brand-900 opacity-100"
                      : "max-w-24 translate-x-0 text-xs text-neutral-400 opacity-100"
                }`}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span className={`h-0.5 min-w-2 flex-1 overflow-hidden rounded-full transition-all duration-300 ease-out ${i < currentIndex ? "bg-brand-900" : "bg-brand-700/40"}`} />
            )}
          </li>
        )
      })}
      </ol>
    </>
  )
}

function StepCard({
  index,
  currentIndex,
  children,
}: {
  index: number
  currentIndex: number
  children: ReactNode
}) {
  const offset = index - currentIndex
  return (
    <div
      data-active={offset === 0}
      aria-hidden={offset !== 0}
      inert={offset !== 0 ? true : undefined}
      className={`absolute inset-x-0 top-0 transition-all duration-300 ease-out will-change-transform ${
        offset === 0
          ? "translate-x-0 opacity-100"
          : offset < 0
            ? "-translate-x-full opacity-0"
            : "translate-x-full opacity-0"
      } ${offset === 0 ? "" : "pointer-events-none"}`}
    >
      {children}
    </div>
  )
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-brand-700/20">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900">{label}</p>
        <p className="mt-0.5 break-words text-sm text-neutral-900">{value}</p>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-brand-900 underline-offset-2 transition-colors hover:bg-brand-700/40 hover:text-brand-900">
        Edit
      </button>
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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-brand-700/40 bg-white p-8 text-center shadow-[0_24px_70px_-32px_rgba(17,139,80,0.35)]"
    >
      <motion.div
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-lg shadow-brand-900/25"
      >
        <Check size={28} />
      </motion.div>
      <h2 className="mt-4 text-xl font-bold text-neutral-900">Inquiry received</h2>
      <p className="mt-2 text-sm text-neutral-500">Our team will contact you about the {name} shortly.</p>
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="relative size-16">
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-brand-700/40" />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className="stroke-brand-900 transition-all duration-1000 ease-linear"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - countdown / 5)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-brand-900">{countdown}</span>
        </div>
        <p className="text-xs text-neutral-400">Redirecting to home...</p>
      </div>
    </motion.div>
  )
}
