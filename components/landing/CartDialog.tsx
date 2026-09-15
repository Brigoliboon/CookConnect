"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, Minus, Plus, X, CheckCircle2, User, Mail, Phone, MapPin, Check, MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { getCart, setCart, type CartItem } from "@/utils/cart"
import { LocationPicker, type Coordinates } from "@/components/ui/LocationPicker"
import { FloatingInput } from "@/components/ui/FloatingInput"
import { CartSidePicker } from "@/components/landing/CartSidePicker"
import { resolveDeliveryAddress, formatPrice } from "@/utils/mapbox"

export function CartDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("cart")
  const [cart, setCartState] = useState<CartItem[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [form, setForm] = useState({ name: "", email: "", mobile: "", address: "" })
  const [locationError, setLocationError] = useState("")
  const [unsupported, setUnsupported] = useState(false)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [feeCents, setFeeCents] = useState<number | null>(null)
  const [pickup, setPickup] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [consent, setConsent] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const panelRef = useRef<HTMLDivElement>(null)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setCartState(getCart())
      setSubmitted(false)
      setConsent(false)
      setPickup(false)
    }
  }

  function togglePickup(checked: boolean) {
    setPickup(checked)
    setLocationError("")
    setUnsupported(false)
    if (checked) {
      setFeeCents(0)
      setConfirmed(true)
      setForm((p) => ({ ...p, address: "Pickup" }))
    } else {
      setFeeCents(null)
      setConfirmed(false)
      setForm((p) => ({ ...p, address: "" }))
    }
  }

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.[0]?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [open, submitted, onClose])

  function commit(next: CartItem[]) {
    setCartState(next)
    setCart(next)
    window.dispatchEvent(new Event("cart-changed"))
  }

  function removeItem(name: string) {
    commit(cart.filter((i) => i.name !== name))
  }

  function changeQty(name: string, delta: number) {
    commit(
      cart
        .map((i) => (i.name === name ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0),
    )
  }

  function setItemNote(name: string, note: string) {
    commit(cart.map((i) => (i.name === name ? { ...i, note: note || undefined } : i)))
  }

  function setItemSide(name: string, opt: { addon_recipe_id: string; addon_name: string; extra_cents: number } | null) {
    commit(
      cart.map((i) => {
        if (i.name !== name) return i
        const base = i.basePrice ?? i.price
        const extra = opt ? opt.extra_cents / 100 : 0
        return {
          ...i,
          basePrice: base,
          addonRecipeId: opt?.addon_recipe_id ?? null,
          addonName: opt?.addon_name ?? null,
          addonExtra: opt?.extra_cents ?? 0,
          price: Math.round((base + extra) * 100) / 100,
        }
      }),
    )
  }

  function handleConfirmLocation() {
    if (!location) {
      setLocationError(t("locError"))
      return
    }
    setLocationError("")
    setLocating(true)
    resolveDeliveryAddress(location.lat, location.lng)
      .then((resolved) => {
        setForm((p) => ({ ...p, address: resolved.address }))
        if (resolved.area.supported) {
          setFeeCents(resolved.area.feeCents)
          setConfirmed(true)
          setUnsupported(false)
        } else {
          setFeeCents(null)
          setConfirmed(false)
          setUnsupported(true)
          setLocationError("")
        }
      })
      .catch(() => {
        setLocationError(t("resolveError"))
      })
      .finally(() => setLocating(false))
  }

  function sanitizeUaLocal(value: string) {
    let d = value.replace(/\D/g, "")
    if (d.startsWith("971")) d = d.slice(3)
    else if (d.startsWith("0971")) d = d.slice(4)
    else if (d.startsWith("0")) d = d.slice(1)
    return d.slice(0, 9)
  }

  async function handleSubmit() {
    if (!pickup && (!confirmed || feeCents === null)) {
      setLocationError(t("confirmError"))
      return
    }
    if (!form.name || !form.mobile || (!pickup && !form.address)) {
      return
    }
    setLocationError("")
    setSubmitError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          mobile_number: `+971${sanitizeUaLocal(form.mobile)}`,
          address: pickup ? "Pickup" : form.address,
          location: pickup ? null : location,
          shipping_cents: pickup ? 0 : feeCents,
          items: cart.map((item) => ({
            recipe_id: item.recipeId ?? null,
            addon_recipe_id: item.addonRecipeId ?? null,
            name: item.name,
            unit_price_cents: Math.round(item.price * 100),
            qty: item.qty,
            note: item.note?.trim() || null,
            image_path: item.image ?? null,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? t("failError"))
      }
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("failError"))
    } finally {
      setSubmitting(false)
    }
  }

  function handleDone() {
    sessionStorage.removeItem("cookconnect_cart")
    window.dispatchEvent(new Event("cart-changed"))
    onClose()
  }

  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0)
  const subtotalCents = cart.reduce((sum, i) => sum + Math.round(i.price * 100) * i.qty, 0)
  const vatCents = Math.round(subtotalCents * 0.05)
  const netCents = subtotalCents - vatCents
  const totalCents = feeCents === null ? subtotalCents : subtotalCents + feeCents

  return (
    <AnimatePresence>
      {open && !submitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">{t("title")}</h2>
              <button onClick={onClose} className="text-neutral-400 transition-colors hover:text-neutral-700">
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-400">{t("empty")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence initial={false} mode="popLayout">
                {cart.map((item) => (
                  <motion.div
                    key={item.name}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, height: 0, paddingTop: 0, paddingBottom: 0, borderWidth: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden rounded-xl border border-neutral-100 p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900">{item.name}</p>
                          <p className="text-xs text-neutral-500">{item.price} AED</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-t border-neutral-100 pt-2 sm:border-0 sm:pt-0">
                        <button
                          onClick={() => changeQty(item.name, -1)}
                          className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100"
                          aria-label={t("decrease")}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                        <button
                          onClick={() => changeQty(item.name, 1)}
                          className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100"
                          aria-label={t("increase")}
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeItem(item.name)}
                          className="ml-auto text-red-500 transition-colors hover:text-red-600 sm:ml-0"
                          aria-label={t("remove")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {item.recipeId && (
                      <div className="mt-2 border-t border-neutral-100 pt-2">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                          {t("sidesTitle")}
                        </p>
                        <CartSidePicker
                          mealRecipeId={item.recipeId}
                          selectedId={item.addonRecipeId}
                          onSelect={(opt) => setItemSide(item.name, opt)}
                        />
                        {item.addonName && (
                          <p className="mt-1 text-xs text-neutral-500">
                            {item.addonName}
                            {(item.addonExtra ?? 0) > 0 ? ` (+${((item.addonExtra ?? 0) / 100).toFixed(2)} AED)` : " (Free)"}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-2 border-t border-neutral-100 pt-2">
                        <div className="flex items-center gap-1.5">
                          <MessageCircle size={12} className="text-neutral-400" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            {t("noteTitle")}
                          </span>
                        </div>
                        <input
                          value={item.note ?? ""}
                          onChange={(e) => setItemNote(item.name, e.target.value)}
                          placeholder={t("notePlaceholder")}
                          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                        />
                      </div>
                  </motion.div>
                ))}
                </AnimatePresence>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                  <span className="text-neutral-500">{t("subtotal")}</span>
                  <span className="font-bold text-neutral-900">{formatPrice(subtotalCents)}</span>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-bold text-neutral-900">Personal Information</h3>
              <FloatingInput
                label={t("fullName")}
                icon={<User size={13} />}
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <div className="flex items-stretch gap-1.5 sm:gap-2">
                <span className="flex shrink-0 items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2 py-3 text-xs font-semibold text-neutral-900 sm:gap-1.5 sm:px-3 sm:text-sm">
                  <img src="/icons/uae-flag.png" alt="UAE" className="h-3 w-4 rounded-[2px] object-cover sm:h-4 sm:w-6" />
                  +971
                </span>
                <div className="min-w-0 flex-1">
                  <FloatingInput
                    label={t("mobile")}
                    icon={<Phone size={13} />}
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={13}
                    value={form.mobile}
                    onChange={(e) => setForm((p) => ({ ...p, mobile: sanitizeUaLocal(e.target.value) }))}
                  />
                </div>
              </div>
              <FloatingInput
                label={t("email")}
                icon={<Mail size={13} />}
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <MapPin size={13} />
                  {t("deliveryLocation")}
                  {!pickup && <span className="text-red-500">*</span>}
                </label>
                <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={pickup}
                    onChange={(e) => togglePickup(e.target.checked)}
                    className="size-4 cursor-pointer accent-neutral-900"
                  />
                  {t("pickup")}
                </label>
                {pickup ? (
                  <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">{t("pickupNote")}</p>
                ) : (
                <>
                <LocationPicker value={location} onChange={(loc) => { setLocation(loc); setConfirmed(false); setFeeCents(null); setUnsupported(false); setLocationError("") }} />
                <button
                  onClick={handleConfirmLocation}
                  disabled={!location || locating}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900/20 py-2 text-xs font-semibold text-neutral-900 transition-all hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {locating ? (
                    t("resolving")
                  ) : confirmed ? (
                    <>
                      <Check size={14} />
                      {t("confirmed")}
                    </>
                  ) : (
                    t("confirmLocation")
                  )}
                </button>
                {unsupported && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-bold text-red-600">{t("unsupportedTitle")}</p>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-red-500">
                      {t("unsupportedBody")}
                    </p>
                  </div>
                )}
                {locationError && !unsupported && <p className="mt-1.5 text-xs text-red-500">{locationError}</p>}
                </>
                )}
              </div>
              {form.address && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500">{t("deliveryAddress")}</label>
                  <input
                    readOnly
                    value={form.address}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none"
                  />
                </div>
              )}

              {feeCents !== null && (
                <div className="rounded-xl bg-neutral-50 p-4 text-sm">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>{t("itemCount", { count: itemCount })}</span>
                    <span>{formatPrice(subtotalCents)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-neutral-500">
                    <span>Ex-VAT subtotal</span>
                    <span>{formatPrice(netCents)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-neutral-500">
                    <span>Shipping</span>
                    <span>{feeCents === 0 ? t("free") : formatPrice(feeCents)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-neutral-500">
                    <span>VAT (5% incl.)</span>
                    <span>{formatPrice(vatCents)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 font-bold text-neutral-900">
                    <span>{t("total")}</span>
                    <span>{formatPrice(totalCents)}</span>
                  </div>
                </div>
              )}
            </div>

                        <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-neutral-500">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-neutral-900"
              />
              <span>
                {t("consentPrefix")}{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-brand-900"
                >
                  {t("termsLink")}
                </a>
                {t("and")}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-brand-900"
                >
                  {t("privacyLink")}
                </a>
                .
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || (!pickup && (!confirmed || feeCents === null)) || !consent || submitting}
              className="mt-3 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? t("placing") : t("placeOrder")}
            </button>
            {submitError && <p className="mt-2 text-center text-xs text-red-500">{submitError}</p>}
            <p className="mt-2 text-center text-xs text-neutral-400">
              {t("inquiryNote")}
            </p>
          </motion.div>
        </motion.div>
      )}

      {open && submitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
            >
              <CheckCircle2 size={32} />
            </motion.div>
            <h2 className="mt-5 text-xl font-bold text-neutral-900">{t("successTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              {t("successBody")}
            </p>
            <button
              onClick={handleDone}
              className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800"
            >
              {t("done")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}