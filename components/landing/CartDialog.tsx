"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, Minus, Plus, X, CheckCircle2, User, Mail, Phone, MapPin, Check, MessageCircle } from "lucide-react"
import { getCart, setCart, type CartItem } from "@/utils/cart"
import { LocationPicker, type Coordinates } from "@/components/ui/LocationPicker"
import { resolveDeliveryAddress, formatPrice } from "@/utils/mapbox"

export function CartDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
  const [confirmed, setConfirmed] = useState(false)
  const [consent, setConsent] = useState(false)
  const [noteOpen, setNoteOpen] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)
  const panelRef = useRef<HTMLDivElement>(null)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setCartState(getCart())
      setSubmitted(false)
      setConsent(false)
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
    commit(cart.map((i) => (i.name === name ? { ...i, note: note.trim() || undefined } : i)))
  }

  function handleConfirmLocation() {
    if (!location) {
      setLocationError("Please set a delivery location")
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
        setLocationError("Unable to resolve delivery address. Please try again.")
      })
      .finally(() => setLocating(false))
  }

  async function handleSubmit() {
    if (!confirmed || feeCents === null) {
      setLocationError("Please confirm a supported delivery location")
      return
    }
    if (!form.name || !form.email || !form.mobile || !form.address) {
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
          mobile_number: form.mobile,
          address: form.address,
          location,
          shipping_cents: feeCents,
          items: cart.map((item) => ({
            name: item.name,
            unit_price_cents: Math.round(item.price * 100),
            qty: item.qty,
            note: item.note ?? null,
            image_path: item.image ?? null,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to place order")
      }
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to place order")
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
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const total = feeCents === null ? subtotal : subtotal + feeCents / 100

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
              <h2 className="text-lg font-bold text-neutral-900">Your Order</h2>
              <button onClick={onClose} className="text-neutral-400 transition-colors hover:text-neutral-700">
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-400">Your cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl border border-neutral-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900">{item.name}</p>
                        <p className="text-xs text-neutral-500">{item.price} AED</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQty(item.name, -1)}
                          className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                        <button
                          onClick={() => changeQty(item.name, 1)}
                          className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => setNoteOpen(noteOpen === item.name ? null : item.name)}
                        className={`transition-colors ${item.note ? "text-brand-900" : "text-neutral-400 hover:text-neutral-700"}`}
                        aria-label={item.note ? "Edit note" : "Add note"}
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        onClick={() => removeItem(item.name)}
                        className="text-neutral-400 transition-colors hover:text-red-500"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {(noteOpen === item.name || item.note) && (
                      <div className="mt-2 border-t border-neutral-100 pt-2">
                        <div className="flex items-center gap-1.5">
                          <MessageCircle size={12} className="text-neutral-400" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            Note for this item
                          </span>
                        </div>
                        <input
                          value={item.note ?? ""}
                          onChange={(e) => setItemNote(item.name, e.target.value)}
                          placeholder="e.g. no onions, extra spicy"
                          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="font-bold text-neutral-900">{subtotal} AED</span>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <User size={13} />
                  Full Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <Mail size={13} />
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <Phone size={13} />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={form.mobile}
                  onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                  placeholder="+971 50 123 4567"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <MapPin size={13} />
                  Delivery Location
                  <span className="text-red-500">*</span>
                </label>
                <LocationPicker value={location} onChange={(loc) => { setLocation(loc); setConfirmed(false); setFeeCents(null); setUnsupported(false); setLocationError("") }} />
                <button
                  onClick={handleConfirmLocation}
                  disabled={!location || locating}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900/20 py-2 text-xs font-semibold text-neutral-900 transition-all hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {locating ? (
                    "Resolving address..."
                  ) : confirmed ? (
                    <>
                      <Check size={14} />
                      Address Confirmed
                    </>
                  ) : (
                    "Confirm Location"
                  )}
                </button>
                {unsupported && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-bold text-red-600">Delivery Not Available</p>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-red-500">
                      Delivery is not supported to your location. We currently deliver to Dubai, Sharjah, Um Al Quwain, and Ajman.
                    </p>
                  </div>
                )}
                {locationError && !unsupported && <p className="mt-1.5 text-xs text-red-500">{locationError}</p>}
              </div>
              {form.address && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Delivery Address</label>
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
                    <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                    <span>{formatPrice(subtotal * 100)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-neutral-500">
                    <span>Shipping fee</span>
                    <span>{feeCents === 0 ? "Free" : formatPrice(feeCents)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 font-bold text-neutral-900">
                    <span>Total</span>
                    <span>{formatPrice(total * 100)}</span>
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
                By placing an order, I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-brand-900"
                >
                  Terms and Conditions
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-brand-900"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || !confirmed || feeCents === null || !consent || submitting}
              className="mt-3 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Placing order..." : "Place Order"}
            </button>
            {submitError && <p className="mt-2 text-center text-xs text-red-500">{submitError}</p>}
            <p className="mt-2 text-center text-xs text-neutral-400">
              You will be placing an inquiry with the restaurant — our team will confirm your order shortly.
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
            <h2 className="mt-5 text-xl font-bold text-neutral-900">Order Received!</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Your order has been received successfully. CookConnect will reach out to you soon about your order.
            </p>
            <button
              onClick={handleDone}
              className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}