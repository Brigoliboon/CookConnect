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
}

/**
 * Adds one unit to the cart, merging with an existing line only when both the
 * meal/serving name and the selected addon match. Returns the updated cart.
 */
export function addCartItem(input: AddCartItemInput): CartItem[] {
  const cart = getCart()
  const addonRecipeId = input.addonRecipeId ?? null
  const existing = cart.find(
    (item) => item.name === input.name && (item.addonRecipeId ?? null) === addonRecipeId,
  )

  if (existing) {
    existing.qty += 1
  } else {
    const extra = (input.addonExtra ?? 0) / 100
    cart.push({
      lineId: newLineId(),
      name: input.name,
      price: Math.round((input.price + extra) * 100) / 100,
      qty: 1,
      image: input.image,
      recipeId: input.recipeId,
      basePrice: input.price,
      addonRecipeId,
      addonName: input.addonName ?? null,
      addonExtra: input.addonExtra ?? 0,
    })
  }

  setCart(cart)
  if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-changed"))
  return cart
}

function newLineId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
