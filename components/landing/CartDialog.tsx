"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, Minus, Plus, X, CheckCircle2, User, Mail, Phone, MapPin } from "lucide-react"
import { getCart, setCart, type CartItem } from "@/utils/cart"
import { LocationPicker, type Coordinates } from "@/components/ui/LocationPicker"

export function CartDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cart, setCartState] = useState<CartItem[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [form, setForm] = useState({ name: "", email: "", mobile: "" })
  const [locationError, setLocationError] = useState("")
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setCartState(getCart())
      setSubmitted(false)
    }
  }, [open])

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

  function handleSubmit() {
    if (!location) {
      setLocationError("Please set a delivery location")
      return
    }
    setLocationError("")
    setSubmitted(true)
  }

  function handleDone() {
    sessionStorage.removeItem("cookconnect_cart")
    window.dispatchEvent(new Event("cart-changed"))
    onClose()
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

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
                    className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3"
                  >
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
                      onClick={() => removeItem(item.name)}
                      className="text-neutral-400 transition-colors hover:text-red-500"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
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
                <LocationPicker value={location} onChange={(loc) => { setLocation(loc); setLocationError("") }} />
                {locationError && <p className="mt-1.5 text-xs text-red-500">{locationError}</p>}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={cart.length === 0}
              className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Place Order
            </button>
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