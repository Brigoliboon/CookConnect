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
}

export type OrderType = "dine_in" | "pickup" | "delivery"
