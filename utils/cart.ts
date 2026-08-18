export interface CartItem {
  name: string
  price: number
  qty: number
  note?: string
  image?: string
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