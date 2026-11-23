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
}

const groupsCache = new Map<string, ModifierGroupView[]>()

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

export async function fetchMealModifierGroups(mealId: string): Promise<ModifierGroupView[]> {
  if (!mealId) return []
  const cached = groupsCache.get(mealId)
  if (cached) return cached
  const res = await fetch(`/api/meal-modifiers?meal_id=${encodeURIComponent(mealId)}`)
  if (!res.ok) return []
  const body = (await res.json()) as { data?: ModifierGroupView[] }
  const data = body.data ?? []
  groupsCache.set(mealId, data)
  return data
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
