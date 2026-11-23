export interface PosServing {
  id: string
  name: string | null
  price: number | null
  calories: number | null
}

export interface PosItem {
  id: string
  name: string
  category: string
  description: string
  image: string
  price: number
  calories: number
  has_addons: boolean
  has_modifiers: boolean
  servings: PosServing[]
}

export interface PosCartLine {
  key: string
  recipeId: string
  servingId: string | null
  servingName: string | null
  name: string
  image: string
  unitPrice: number
  qty: number
  note: string
  addonRecipeId: string | null
  addonName: string | null
  addonExtra: number
  modifiers?: import("@/lib/modifiers").CartModifier[]
}

export type OrderType = "dine_in" | "pickup" | "delivery"
