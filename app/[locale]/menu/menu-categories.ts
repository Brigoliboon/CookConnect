export const DEFAULT_CATEGORY = "meals"
export const DEFAULT_SUBCATEGORY = "beef"

export interface MenuCategory {
  id: string
  image: string
  subs?: string[]
}

export const categories: MenuCategory[] = [
  { id: "meals", image: "/menu-icons/meals.webp", subs: ["beef", "chicken", "seafood", "soup", "biryani", "risotto", "vegetable", "breakfast"] },
  { id: "salad", image: "/menu-icons/salad.webp" },
  { id: "rice-sides", image: "/menu-icons/rice-sides.webp" },
  { id: "platters", image: "/menu-icons/platters.webp" },
  { id: "pasta", image: "/menu-icons/pasta.webp" },
  { id: "wraps", image: "/menu-icons/wraps.webp" },
  { id: "pizza", image: "/menu-icons/pizza.webp" },
  { id: "burgers", image: "/menu-icons/burgers.webp" },
  { id: "desserts", image: "/menu-icons/desserts.webp" },
  { id: "drinks", image: "/menu-icons/drinks.webp", subs: ["smoothie", "juice", "beverages"] },
]

export const subValues: Record<string, string> = {
  beef: "beef",
  chicken: "chicken",
  seafood: "seafood",
  soup: "soup",
  breakfast: "breakfast",
  biryani: "biryani",
  risotto: "risotto",
  vegetable: "vegetable",
  smoothie: "smoothie",
  juice: "juice",
  beverages: "beverages",
}

export const catValues: Record<string, string> = {
  salad: "salad",
  "rice-sides": "rice-sides",
  platters: "platters",
  pasta: "pasta",
  wraps: "wrap",
  pizza: "pizza",
  burgers: "burgers",
  desserts: "desserts",
  drinks: "drinks",
}
