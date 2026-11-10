"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Check, X, User, Phone,
  Store, Bike, UtensilsCrossed, MapPin, Receipt,
} from "lucide-react"
import { formatPrice, resolveDeliveryAddress } from "@/utils/mapbox"
import { imageThumb } from "@/lib/images"
import { Modal } from "@/components/ui/Modal"
import { LocationPicker, type Coordinates } from "@/components/ui/LocationPicker"
import { CartSidePicker } from "@/components/landing/CartSidePicker"
import { PosMealCard } from "./PosMealCard"
import { CATEGORY_FILTERS, mapRecipe } from "./catalog"
import type { OrderType, PosCartLine, PosItem } from "./types"

function sanitizeUaLocal(value: string) {
  let d = value.replace(/\D/g, "")
  if (d.startsWith("971")) d = d.slice(3)
  else if (d.startsWith("0971")) d = d.slice(4)
  else if (d.startsWith("0")) d = d.slice(1)
  return d.slice(0, 9)
}

export function PosTerminal() {
  const router = useRouter()

  // Catalog state
  const [menu, setMenu] = useState<PosItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")

  // Cart state
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false) // mobile drawer
  const [customer, setCustomer] = useState({ name: "", mobile: "", address: "" })
  const [orderType, setOrderType] = useState<OrderType>("dine_in")
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [unsupported, setUnsupported] = useState(false)
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false)
  const [feeCents, setFeeCents] = useState<number | null>(null)
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState("")
  const [placedOrder, setPlacedOrder] = useState<{ id: string; total: string } | null>(null)

  useEffect(() => {
    fetch("/api/recipe?is_active=true&sort=name")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch menu")
        return (data.data ?? data) as Record<string, unknown>[]
      })
      .then((data) => setMenu(data.map(mapRecipe)))
      .catch((e) => setMenuError(e.message || "Failed to load menu"))
      .finally(() => setMenuLoading(false))
  }, [])

  const filteredMenu = useMemo(() => {
    const def = CATEGORY_FILTERS.find((c) => c.id === category)
    const q = search.trim().toLowerCase()
    return menu.filter((m) => {
      const matchCat = !def || category === "all" || (def.match ?? []).includes(m.category)
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [menu, category, search])

  const activeCategory = CATEGORY_FILTERS.find((c) => c.id === category) ?? CATEGORY_FILTERS[0]

  const cartQtyByRecipe = useMemo(() => {
    const map = new Map<string, number>()
    for (const line of cart) map.set(line.recipeId, (map.get(line.recipeId) ?? 0) + line.qty)
    return map
  }, [cart])

  function addToCart(item: PosItem, servingIdx: number) {
    const serving = item.servings[Math.min(servingIdx, item.servings.length - 1)] ?? null
    const unitPrice = Number(serving?.price ?? item.price) || 0
    const label = serving?.name ? `${item.name} (${serving.name})` : item.name
    const key = `${item.id}::${serving?.id ?? "base"}`
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key)
      if (existing) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
      return [...prev, {
        key, recipeId: item.id, servingId: serving?.id ?? null, servingName: serving?.name ?? null,
        name: label, image: item.image, unitPrice, qty: 1, note: "",
        addonRecipeId: null, addonName: null, addonExtra: 0,
      }]
    })
  }

  function bumpRecipe(item: PosItem, delta: number) {
    // Adjust the most recent line for that recipe (POS card stepper)
    setCart((prev) => {
      const idx = [...prev].map((l) => l.recipeId).lastIndexOf(item.id)
      if (idx === -1) return prev
      const next = [...prev]
      const line = { ...next[idx], qty: next[idx].qty + delta }
      if (line.qty <= 0) next.splice(idx, 1)
      else next[idx] = line
      return next
    })
  }

  function changeLineQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0),
    )
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  function setLineNote(key: string, note: string) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, note } : l)))
  }

  function setLineSide(key: string, opt: { addon_recipe_id: string; addon_name: string; extra_cents: number } | null) {
    setCart((prev) => prev.map((l) => {
      if (l.key !== key) return l
      if (!opt) return { ...l, addonRecipeId: null, addonName: null, addonExtra: 0 }
      return { ...l, addonRecipeId: opt.addon_recipe_id, addonName: opt.addon_name, addonExtra: opt.extra_cents }
    }))
  }

  function handleOrderTypeChange(next: OrderType) {
    if (next === orderType) return
    setOrderType(next)
    // Reset delivery pin state whenever leaving/entering delivery (mirrors CartDialog pickup toggle)
    setLocation(null)
    setLocating(false)
    setLocationError("")
    setUnsupported(false)
    setDeliveryConfirmed(false)
    setFeeCents(null)
    setCustomer((p) => ({ ...p, address: "" }))
  }

  function handleConfirmLocation() {
    if (!location) {
      setLocationError("Drop a pin on the map first")
      return
    }
    setLocationError("")
    setLocating(true)
    resolveDeliveryAddress(location.lat, location.lng)
      .then((resolved) => {
        setCustomer((p) => ({ ...p, address: resolved.address }))
        if (resolved.area.supported) {
          setFeeCents(resolved.area.feeCents)
          setDeliveryConfirmed(true)
          setUnsupported(false)
        } else {
          setFeeCents(null)
          setDeliveryConfirmed(false)
          setUnsupported(true)
          setLocationError("")
        }
      })
      .catch(() => {
        setLocationError("Could not resolve address for this pin")
      })
      .finally(() => setLocating(false))
  }

  const itemCount = cart.reduce((s, l) => s + l.qty, 0)
  const subtotalCents = cart.reduce(
    (s, l) => s + (Math.round(l.unitPrice * 100) + (l.addonExtra ?? 0)) * l.qty, 0,
  )
  const vatCents = Math.round(subtotalCents * 0.05)
  const shipCents = orderType === "delivery" && feeCents !== null ? feeCents : 0
  const totalCents = subtotalCents + shipCents

  const needsContact = orderType !== "dine_in"
  const canPlace =
    cart.length > 0 &&
    (!needsContact || customer.name.trim() !== "") &&
    (!needsContact || sanitizeUaLocal(customer.mobile).length >= 9) &&
    (orderType !== "delivery" || (deliveryConfirmed && feeCents !== null && customer.address.trim() !== "")) &&
    !placing

  async function placeOrder() {
    if (!canPlace) return
    setPlacing(true)
    setPlaceError("")
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customer.name.trim() || "Walk-in",
          email: "",
          mobile_number: sanitizeUaLocal(customer.mobile)
            ? `+971${sanitizeUaLocal(customer.mobile)}`
            : "",
          address: orderType === "delivery" ? customer.address.trim() : orderType === "pickup" ? "Pickup" : "Dine-in",
          location: orderType === "delivery" ? location : null,
          shipping_cents: shipCents,
          status: "confirmed",
          items: cart.map((l) => ({
            recipe_id: l.recipeId,
            addon_recipe_id: l.addonRecipeId,
            qty: l.qty,
            note: (l.note?.trim() ? `[${orderType.replace("_", " ")}] ${l.note.trim()}` : `[${orderType.replace("_", " ")}]`) || null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to place order")
      setPlacedOrder({ id: data.id, total: formatPrice(Number(data.subtotal_cents ?? subtotalCents) + Number(data.shipping_cents ?? 0)) })
      setCart([])
      setCustomer({ name: "", mobile: "", address: "" })
      setLocation(null)
      setDeliveryConfirmed(false)
      setFeeCents(null)
      setUnsupported(false)
      setLocationError("")
      setCartOpen(false)
    } catch (e) {
      setPlaceError(e instanceof Error ? e.message : "Failed to place order")
    } finally {
      setPlacing(false)
    }
  }

  const cartPanel = (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
          <ShoppingCart size={16} /> Current Order
          {itemCount > 0 && (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-bold text-white">{itemCount}</span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50">
              <Trash2 size={12} /> Clear
            </button>
          )}
          <button onClick={() => setCartOpen(false)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 lg:hidden" aria-label="Close cart">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* Customer */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-neutral-100 p-1.5">
            {([
              { id: "dine_in", label: "Dine-in", icon: UtensilsCrossed },
              { id: "pickup", label: "Pickup", icon: Store },
              { id: "delivery", label: "Delivery", icon: Bike },
            ] as { id: OrderType; label: string; icon: typeof Store }[]).map((o) => (
              <button
                key={o.id}
                onClick={() => handleOrderTypeChange(o.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                  orderType === o.id ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <o.icon size={15} /> {o.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={customer.name}
              onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
              placeholder={needsContact ? "Customer name *" : "Customer name (optional)"}
              className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
            />
          </div>
          <div className="flex items-stretch gap-1.5">
            <span className="flex shrink-0 items-center rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2.5 text-xs font-semibold text-neutral-900">+971</span>
            <div className="relative min-w-0 flex-1">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={customer.mobile}
                onChange={(e) => setCustomer((p) => ({ ...p, mobile: sanitizeUaLocal(e.target.value) }))}
                placeholder={needsContact ? "5X XXX XXXX *" : "5X XXX XXXX (optional)"}
                inputMode="numeric"
                className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </div>
          </div>
          {orderType === "delivery" && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <MapPin size={13} />
                Delivery location
                <span className="text-red-500">*</span>
              </label>
              <LocationPicker
                value={location}
                onChange={(loc) => {
                  setLocation(loc)
                  setDeliveryConfirmed(false)
                  setFeeCents(null)
                  setUnsupported(false)
                  setLocationError("")
                }}
              />
              <button
                onClick={handleConfirmLocation}
                disabled={!location || locating}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-900/20 py-2 text-xs font-semibold text-neutral-900 transition-all hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {locating ? (
                  "Resolving address…"
                ) : deliveryConfirmed ? (
                  <>
                    <Check size={14} />
                    Location confirmed
                  </>
                ) : (
                  "Confirm location"
                )}
              </button>
              {unsupported && (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold text-red-600">Outside delivery area</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-red-500">
                    This pin is outside our delivery zone. Move the pin or switch to pickup.
                  </p>
                </div>
              )}
              {locationError && !unsupported && <p className="mt-1.5 text-xs text-red-500">{locationError}</p>}
              {customer.address && (
                <input
                  readOnly
                  value={customer.address}
                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-900 outline-none"
                />
              )}
            </div>
          )}
        </div>

        {/* Lines */}
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 py-10">
            <ShoppingCart size={32} className="mb-2 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">Cart is empty</p>
            <p className="mt-0.5 text-xs text-neutral-400">Tap any item to add it</p>
          </div>
        ) : (
          <div className="space-y-2 pr-1">
            <AnimatePresence initial={false}>
              {cart.map((line) => {
                const lineTotal = (Math.round(line.unitPrice * 100) + (line.addonExtra ?? 0)) * line.qty
                return (
                  <motion.div
                    key={line.key}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="rounded-xl border border-neutral-100 p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {line.image && (
                        <Image
                          src={imageThumb(line.image)}
                          alt={line.name}
                          width={44}
                          height={44}
                          unoptimized
                          loading="lazy"
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-neutral-900">{line.name}</p>
                        <p className="text-[11px] text-neutral-500">
                          {formatPrice(Math.round(line.unitPrice * 100) + (line.addonExtra ?? 0))}
                          {line.addonName && <span className="text-brand-900"> · +{line.addonName}</span>}
                        </p>
                      </div>
                      <button onClick={() => removeLine(line.key)} className="shrink-0 p-1 text-neutral-300 hover:text-red-500" aria-label="Remove item">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeLineQty(line.key, -1)} className="flex size-6 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100" aria-label="Decrease">
                          <Minus size={11} />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{line.qty}</span>
                        <button onClick={() => changeLineQty(line.key, 1)} className="flex size-6 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100" aria-label="Increase">
                          <Plus size={11} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-neutral-900">{formatPrice(lineTotal)}</span>
                    </div>
                    <div className="mt-2 border-t border-neutral-50 pt-2">
                      <CartSidePicker
                        mealRecipeId={line.recipeId}
                        selectedId={line.addonRecipeId}
                        onSelect={(opt) => setLineSide(line.key, opt)}
                      />
                      <input
                        value={line.note}
                        onChange={(e) => setLineNote(line.key, e.target.value)}
                        placeholder="Note (e.g. no onion)"
                        className="mt-1.5 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                      />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Totals + submit */}
      <div className="border-t border-neutral-100 px-4 py-3">
        <div className="space-y-1 text-xs text-neutral-500">
          <div className="flex justify-between"><span>Subtotal ({itemCount} items)</span><span className="font-semibold text-neutral-900">{formatPrice(subtotalCents)}</span></div>
          <div className="flex justify-between"><span>VAT (5% incl.)</span><span>{formatPrice(vatCents)}</span></div>
          {orderType === "delivery" && (
            <div className="flex justify-between">
              <span>Delivery fee</span>
              <span>{feeCents === null ? "—" : feeCents === 0 ? "Free" : formatPrice(feeCents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-100 pt-1.5 text-sm font-bold text-neutral-900">
            <span>Total</span><span>{formatPrice(totalCents)}</span>
          </div>
        </div>
        {placeError && <p className="mt-2 text-center text-xs text-red-500">{placeError}</p>}
        <button
          onClick={placeOrder}
          disabled={!canPlace}
          className="mt-2.5 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {placing ? "Placing order…" : `Place Order · ${formatPrice(totalCents)}`}
        </button>
        {!canPlace && cart.length > 0 && (
          <p className="mt-1.5 text-center text-[11px] text-neutral-400">
            {needsContact
              ? `Enter customer name + valid mobile${orderType === "delivery" ? " + confirm pin on map" : ""}`
              : "Tap Place Order to send to kitchen"}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-neutral-50 via-white to-neutral-100 lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:overflow-hidden">
      <div className="w-full py-6 lg:flex lg:h-full lg:flex-col lg:py-4">
        {/* Header */}
        <div className="mb-5 flex shrink-0 flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-900 to-brand-400 text-white shadow-lg">
              <Store size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Point of Sale</h1>
              <p className="text-sm text-neutral-500">Take walk-in orders in seconds</p>
            </div>
          </div>
          <Link
            href="/employee/orders"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 backdrop-blur-sm transition-all hover:border-neutral-400 hover:bg-white"
          >
            <Receipt size={14} /> Orders
          </Link>
        </div>

        {/* Three-pane layout: categories | menu | cart */}
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[224px_minmax(0,1fr)_380px] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[240px_minmax(0,1fr)_420px]">
          {/* 1. Categories + search */}
          <aside className="rounded-2xl border border-neutral-200/70 bg-white p-3 shadow-sm lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu…"
                className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-9 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <p className="mt-4 px-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Categories</p>
            <div className="mt-1 flex flex-wrap gap-1.5 lg:flex-col">
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-all lg:w-full lg:text-left ${
                    category === c.id ? "bg-neutral-900 text-white shadow-sm" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </aside>

          {/* 2. Menu grid */}
          <section className="flex min-w-0 flex-col lg:h-full lg:min-h-0">
            <div className="flex shrink-0 items-center justify-between rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">{activeCategory.label}</h2>
                <p className="text-xs text-neutral-400">
                  {filteredMenu.length} item{filteredMenu.length !== 1 ? "s" : ""}{search && <> for “{search}”</>}
                </p>
              </div>
            </div>

            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            {menuLoading ? (
              <ul className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-200" />
                ))}
              </ul>
            ) : menuError ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">{menuError}</div>
            ) : filteredMenu.length === 0 ? (
              <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-20">
                <UtensilsCrossed size={40} className="mb-3 text-neutral-300" />
                <p className="text-sm font-medium text-neutral-500">No items found</p>
                <p className="mt-0.5 text-xs text-neutral-400">Try a different search or category</p>
              </div>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredMenu.map((item) => (
                  <PosMealCard
                    key={item.id}
                    item={item}
                    qtyInCart={cartQtyByRecipe.get(item.id) ?? 0}
                    onAdd={(idx) => addToCart(item, idx)}
                    onInc={() => bumpRecipe(item, 1)}
                    onDec={() => bumpRecipe(item, -1)}
                  />
                ))}
              </ul>
            )}
              <div className="h-24 lg:hidden" />
            </div>
          </section>

          {/* 3. Cart */}
          <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            {cartPanel}
          </div>
        </div>
      </div>

      {/* Mobile / tablet cart: floating bar + drawer */}
      <>
        <AnimatePresence>
          {itemCount > 0 && !cartOpen && (
            <motion.button
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              onClick={() => setCartOpen(true)}
              className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4 text-white shadow-2xl shadow-neutral-900/30 active:scale-[0.99] lg:hidden"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart size={16} />
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </span>
              <span className="text-sm font-bold">{formatPrice(totalCents)}</span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cartOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setCartOpen(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 top-10 overflow-hidden rounded-t-3xl bg-neutral-50 sm:inset-x-auto sm:right-0 sm:top-0 sm:w-[420px] sm:rounded-l-3xl sm:rounded-tr-none"
              >
                <div className="h-full p-3">{cartPanel}</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>

      {/* Order success */}
      <Modal open={!!placedOrder} onClose={() => setPlacedOrder(null)} title="Order placed">
        {placedOrder && (
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={28} />
            </div>
            <p className="mt-4 text-lg font-bold text-neutral-900">{placedOrder.total}</p>
            <p className="mt-1 break-all text-xs text-neutral-500">Order #{placedOrder.id}</p>
            <p className="mt-2 text-sm text-neutral-500">Find it under Orders → Confirmed.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setPlacedOrder(null); router.push("/employee/orders") }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <Receipt size={14} /> View order
              </button>
              <button
                onClick={() => setPlacedOrder(null)}
                className="rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                New sale
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
