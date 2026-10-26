import type { PosItem } from "./types"

export const fallbackImages: Record<string, string> = {
  beef: "/placeholder/empty_plate.svg",
  chicken: "/placeholder/empty_plate.svg",
  seafood: "/placeholder/empty_plate.svg",
  salad: "/placeholder/empt_salad_bowl.png",
  wrap: "/placeholder/empty_plate.svg",
  breakfast: "/placeholder/empty_bowl.png",
  pasta: "/placeholder/empty_plate.svg",
  soup: "/placeholder/empty_bowl.png",
  pizza: "/placeholder/empty_plate.svg",
  burgers: "/placeholder/empty_plate.svg",
  drinks: "/drink_sample.svg",
  biryani: "/placeholder/empty_plate.svg",
  risotto: "/placeholder/empty_plate.svg",
  smoothie: "/drink_sample.svg",
  juice: "/drink_sample.svg",
  beverages: "/drink_sample.svg",
  desserts: "/drink_sample.svg",
  "rice-sides": "/placeholder/empty_plate.svg",
  platters: "/drink_sample.svg",
  vegetable: "/placeholder/empty_plate.svg",
}

export interface CategoryFilter {
  id: string
  label: string
  match?: string[]
}

export const CATEGORY_FILTERS: CategoryFilter[] = [
  { id: "all", label: "All" },
  { id: "meals", label: "Meals", match: ["beef", "chicken", "seafood", "soup", "breakfast", "biryani", "risotto", "vegetable"] },
  { id: "salad", label: "Salads", match: ["salad"] },
  { id: "rice-sides", label: "Rice & Sides", match: ["rice-sides"] },
  { id: "platters", label: "Platters", match: ["platters"] },
  { id: "pasta", label: "Pasta", match: ["pasta"] },
  { id: "wraps", label: "Wraps", match: ["wrap"] },
  { id: "pizza", label: "Pizza", match: ["pizza"] },
  { id: "burgers", label: "Burgers", match: ["burgers"] },
  { id: "desserts", label: "Desserts", match: ["desserts"] },
  { id: "drinks", label: "Drinks", match: ["drinks", "smoothie", "juice", "beverages"] },
]

export function mapRecipe(r: Record<string, unknown>): PosItem {
  const category = (r.category as string) ?? ""
  const servings = ((r.servings as Record<string, unknown>[]) ?? [])
    .filter((s) => (s.is_active as boolean) !== false)
    .map((s) => ({
      id: s.id as string,
      name: (s.name as string | null) ?? null,
      price: (s.price as number | null) ?? null,
      calories: (s.calories as number | null) ?? null,
    }))
  const first = servings[0]
  const price = (r.price as number) ?? first?.price ?? 0
  const calories = (r.calories as number) ?? first?.calories ?? 0
  return {
    id: (r.id as string) ?? "",
    name: (r.name as string) ?? "",
    category,
    description: (r.description as string) ?? "",
    image: (r.image_path as string) ?? fallbackImages[category] ?? "/drink_sample.svg",
    price: Number(price) || 0,
    calories: Number(calories) || 0,
    servings,
  }
}
