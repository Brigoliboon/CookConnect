export interface ModifierOptionView {
  id: string
  group_id: string
  recipe_id: string | null
  name: string
  name_ar: string | null
  price_cents: number
  is_default: boolean
  sort_order: number
  is_active: boolean
  recipe_name?: string | null
}

export interface ModifierGroupView {
  id: string
  name: string
  name_ar: string | null
  sort_order: number
  is_active: boolean
  options: ModifierOptionView[]
}

export interface CartModifier {
  groupId: string
  groupName: string
  groupNameAr: string | null
  optionId: string
  optionName: string
  optionNameAr: string | null
  priceCents: number
}

export interface MealAddTarget {
  recipeId: string
  name: string
  /** Unit price of the meal/serving, in AED (not including add-ons). */
  price: number
  image?: string
  hasModifiers?: boolean
  hasAddons?: boolean
}

const groupsCache = new Map<string, ModifierGroupView[]>()
const groupsInflight = new Map<string, Promise<ModifierGroupView[]>>()
const addonsCache = new Map<string, RecipeAddonOption[]>()
const addonsInflight = new Map<string, Promise<RecipeAddonOption[]>>()

export interface RecipeAddonOption {
  id: string
  meal_recipe_id: string
  addon_recipe_id: string
  extra_cents: number
  is_default: boolean
  addon_name: string
  addon_image_path: string | null
}

/** Active groups that still have at least one active option. */
export function activeModifierGroups(groups: ModifierGroupView[]): ModifierGroupView[] {
  return groups
    .filter((group) => group.is_active)
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => option.is_active),
    }))
    .filter((group) => group.options.length > 0)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
}

export function peekMealModifierGroups(mealId: string): ModifierGroupView[] | undefined {
  return groupsCache.get(mealId)
}

async function fetchJsonOnce<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (await res.json()) as T
}

async function fetchWithRetryOnce<T>(url: string): Promise<T> {
  try {
    return await fetchJsonOnce<T>(url)
  } catch {
    return await fetchJsonOnce<T>(url)
  }
}

export async function fetchMealModifierGroups(mealId: string): Promise<ModifierGroupView[]> {
  if (!mealId) return []
  const cached = groupsCache.get(mealId)
  if (cached) return cached
  const inflight = groupsInflight.get(mealId)
  if (inflight) return inflight

  const request = (async () => {
    try {
      const body = await fetchWithRetryOnce<{ data?: ModifierGroupView[] }>(
        `/api/meal-modifiers?meal_id=${encodeURIComponent(mealId)}`,
      )
      const data = body.data ?? []
      groupsCache.set(mealId, data)
      return data
    } finally {
      groupsInflight.delete(mealId)
    }
  })()

  groupsInflight.set(mealId, request)
  return request
}

export function prefetchMealModifierGroups(mealId: string): Promise<ModifierGroupView[]> {
  return fetchMealModifierGroups(mealId)
}

export function peekRecipeAddons(mealId: string): RecipeAddonOption[] | undefined {
  return addonsCache.get(mealId)
}

export async function fetchRecipeAddons(mealId: string): Promise<RecipeAddonOption[]> {
  if (!mealId) return []
  const cached = addonsCache.get(mealId)
  if (cached) return cached
  const inflight = addonsInflight.get(mealId)
  if (inflight) return inflight

  const request = (async () => {
    try {
      const body = await fetchWithRetryOnce<{ data?: RecipeAddonOption[] }>(
        `/api/recipe-addons?meal_id=${encodeURIComponent(mealId)}`,
      )
      const data = body.data ?? []
      addonsCache.set(mealId, data)
      return data
    } finally {
      addonsInflight.delete(mealId)
    }
  })()

  addonsInflight.set(mealId, request)
  return request
}

export function formatAddonAed(cents: number): string | null {
  if (!Number.isFinite(cents) || cents <= 0) return null
  const aed = cents / 100
  const n = Number.isInteger(aed) ? String(aed) : aed.toFixed(2)
  return `+AED ${n}`
}

export function localizedName(en: string, ar: string | null | undefined, locale: string): string {
  if (locale === "ar" && ar && ar.trim()) return ar
  return en
}

export function modifierOptionKey(modifiers: CartModifier[] | undefined): string {
  if (!modifiers?.length) return ""
  return [...modifiers.map((item) => item.optionId)].sort().join(",")
}

export function modifiersExtraCents(modifiers: CartModifier[] | undefined): number {
  return (modifiers ?? []).reduce((sum, item) => sum + (item.priceCents || 0), 0)
}

export function unitPriceAed(
  basePrice: number,
  modifiers?: CartModifier[],
  addonExtraCents = 0,
): number {
  const extra = modifiersExtraCents(modifiers) + addonExtraCents
  return Math.round((basePrice + extra / 100) * 100) / 100
}

export function picksFromSelection(
  groups: ModifierGroupView[],
  selectedByGroup: Record<string, string>,
): CartModifier[] {
  const picks: CartModifier[] = []
  for (const group of groups) {
    const optionId = selectedByGroup[group.id]
    const option = group.options.find((item) => item.id === optionId)
    if (!option) continue
    picks.push({
      groupId: group.id,
      groupName: group.name,
      groupNameAr: group.name_ar,
      optionId: option.id,
      optionName: option.name,
      optionNameAr: option.name_ar,
      priceCents: option.price_cents,
    })
  }
  return picks
}

export function defaultSelection(groups: ModifierGroupView[]): Record<string, string> {
  const selected: Record<string, string> = {}
  for (const group of groups) {
    const preferred = group.options.find((item) => item.is_default) ?? group.options[0]
    if (preferred) selected[group.id] = preferred.id
  }
  return selected
}

export function allGroupsPicked(
  groups: ModifierGroupView[],
  selectedByGroup: Record<string, string>,
): boolean {
  return groups.every((group) => group.options.some((option) => option.id === selectedByGroup[group.id]))
}
