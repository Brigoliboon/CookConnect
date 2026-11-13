/** Higher = more likely on the shared cook list. Unknown categories use the default. */
export const DEFAULT_CATEGORY_PRIORITY = 55

/**
 * Subscription cook-list weights. Chicken is the daily staple.
 * Beef is next. Seafood is occasional — never treated as equal to beef.
 * Burgers, pizza, sides, and drinks stay rare.
 */
export const CATEGORY_PRIORITY: Record<string, number> = {
  chicken: 100,
  beef: 70,
  vegetable: 66,
  biryani: 64,
  risotto: 62,
  pasta: 60,
  salad: 58,
  soup: 56,
  platters: 54,
  wrap: 40,
  "rice-sides": 36,
  seafood: 32,
  pizza: 18,
  burgers: 16,
  burger: 16,
  sandwiches: 16,
  breakfast: 70,
  desserts: 10,
  dessert: 10,
  smoothie: 8,
  juice: 8,
  drinks: 5,
  beverages: 5,
}

/** At most one of these on the shared pack unless nothing else is edible. */
export const OCCASIONAL_CATEGORIES = new Set([
  "seafood",
  "pizza",
  "burgers",
  "burger",
  "sandwiches",
  "desserts",
  "dessert",
  "smoothie",
  "juice",
  "drinks",
  "beverages",
])

export function categoryKey(category: string | null | undefined): string {
  return (category ?? "").trim().toLowerCase()
}

export function categoryPriority(category: string | null | undefined): number {
  const key = categoryKey(category)
  if (!key) return DEFAULT_CATEGORY_PRIORITY
  const exact = CATEGORY_PRIORITY[key]
  if (exact !== undefined) return exact
  for (const [name, score] of Object.entries(CATEGORY_PRIORITY)) {
    if (key.includes(name)) return score
  }
  return DEFAULT_CATEGORY_PRIORITY
}

export function isOccasionalCategory(category: string | null | undefined): boolean {
  const key = categoryKey(category)
  if (!key) return false
  if (OCCASIONAL_CATEGORIES.has(key)) return true
  for (const name of OCCASIONAL_CATEGORIES) {
    if (key.includes(name)) return true
  }
  return false
}

/** Blend eaters + category so a small coverage edge cannot promote seafood over chicken. */
export function packScore(coverage: number, category: string | null | undefined): number {
  return coverage * 8 + categoryPriority(category)
}
