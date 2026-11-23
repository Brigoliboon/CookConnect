import type { CartModifier } from "@/lib/modifiers"
import { modifierOptionKey, unitPriceAed } from "@/lib/modifiers"

export type { CartModifier }

export interface CartItem {
  /** Stable per-line id so two lines of the same meal with different sides stay independent. */
  lineId?: string
  name: string
  price: number
  qty: number
  note?: string
  image?: string
  recipeId?: string
  basePrice?: number
  addonRecipeId?: string | null
  addonName?: string | null
  addonExtra?: number
  modifiers?: CartModifier[]
}

export const CART_KEY = "cookconnect_cart"

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(CART_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.qty, 0)
}

export function setCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(CART_KEY, JSON.stringify(items))
}

/** Stable identifier for cart operations; older lines fall back to their name. */
export function cartLineKey(item: CartItem): string {
  return item.lineId ?? item.name
}

export interface AddCartItemInput {
  name: string
  price: number
  image?: string
  recipeId?: string
  addonRecipeId?: string | null
  addonName?: string | null
  /** Extra price in cents. */
  addonExtra?: number
  modifiers?: CartModifier[]
}

function sameLine(item: CartItem, input: AddCartItemInput): boolean {
  if (item.name !== input.name) return false
  if ((item.addonRecipeId ?? null) !== (input.addonRecipeId ?? null)) return false
  return modifierOptionKey(item.modifiers) === modifierOptionKey(input.modifiers)
}

/**
 * Adds one unit to the cart, merging with an existing line only when both the
 * meal/serving name and the selected modifiers (or legacy addon) match.
 * Returns the updated cart.
 */
export function addCartItem(input: AddCartItemInput): CartItem[] {
  const cart = getCart()
  const existing = cart.find((item) => sameLine(item, input))

  if (existing) {
    existing.qty += 1
  } else {
    const addonExtra = input.addonExtra ?? 0
    const modifiers = input.modifiers?.length ? input.modifiers : undefined
    cart.push({
      lineId: newLineId(),
      name: input.name,
      price: unitPriceAed(input.price, modifiers, addonExtra),
      qty: 1,
      image: input.image,
      recipeId: input.recipeId,
      basePrice: input.price,
      addonRecipeId: input.addonRecipeId ?? null,
      addonName: input.addonName ?? null,
      addonExtra,
      modifiers,
    })
  }

  setCart(cart)
  if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-changed"))
  return cart
}

export function applyModifiersToLine(item: CartItem, modifiers: CartModifier[]): CartItem {
  const base = item.basePrice ?? item.price
  return {
    ...item,
    basePrice: base,
    modifiers,
    addonRecipeId: null,
    addonName: null,
    addonExtra: 0,
    price: unitPriceAed(base, modifiers, 0),
  }
}

function newLineId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
