import { MENU_CATEGORIES } from "@/constants/menu"

export const INGREDIENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Protein-style meal types staff/customers can skip as a whole category. */
export const RESTRICTABLE_MEAL_CATEGORIES = ["seafood", "beef", "chicken"] as const

export type IngredientRef = { id: string; name: string }

export type RestrictionMatchInput = {
  restrictedIngredientIds: string[]
  restrictedCategories: string[]
}

export type RestrictionRecipe = {
  category?: string | null
  servings?: { ingredients?: { id?: string | null; name?: string | null }[] }[]
}

export type RestrictionFailReason = "category" | "ingredient"

export type ResolvedRestrictions = {
  restrictions: string[]
  restrictionNames: Record<string, string>
  restrictedCategories: string[]
  leftovers: string[]
}

const CATEGORY_ALIASES: Record<string, string> = {
  seafood: "seafood",
  "sea food": "seafood",
  fish: "seafood",
  shellfish: "seafood",
  beef: "beef",
  chicken: "chicken",
}

/** Phrase → catalog ingredient names. Used when Excel/CSV wording is not the catalog name. */
const INGREDIENT_ALIASES: Record<string, string[]> = {
  capsicum: ["Bell Peppers"],
  "bell pepper": ["Bell Peppers"],
  whitefish: ["Whitefish (Mixed Species)", "White Fish Fillet"],
  "white fish": ["Whitefish (Mixed Species)", "White Fish Fillet"],
  prawn: ["Shrimp"],
  prawns: ["Shrimp"],
  pancake: ["Plain Pancakes"],
  pancakes: ["Plain Pancakes"],
  kabab: ["Kebab"],
  kebab: ["Kebab"],
}

function uniqueLower(values: Iterable<string>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const key = value.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function collapseWs(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

export function isIngredientUuid(value: string): boolean {
  return INGREDIENT_UUID_RE.test(value.trim())
}

export function indexIngredientsByName(ingredients: Iterable<IngredientRef>): Map<string, IngredientRef> {
  const map = new Map<string, IngredientRef>()
  for (const ingredient of ingredients) {
    for (const key of [ingredient.name.trim().toLowerCase(), collapseWs(ingredient.name)]) {
      if (key && !map.has(key)) map.set(key, ingredient)
    }
  }
  return map
}

export function indexIngredientsById(ingredients: Iterable<IngredientRef>): Map<string, IngredientRef> {
  return new Map(Array.from(ingredients, (ingredient) => [ingredient.id, ingredient]))
}

export function knownRecipeCategories(): Set<string> {
  return new Set(MENU_CATEGORIES.map((c) => c.value.toLowerCase()))
}

export function categoryRestrictionLabel(category: string): string {
  const key = category.trim().toLowerCase()
  const found = MENU_CATEGORIES.find((c) => c.value === key)
  const name = found?.label ?? category.trim()
  return name.toLowerCase().startsWith("no ") ? name : `No ${name}`
}

export function restrictionDetailsPayload(
  restricted: IngredientRef[],
  restrictedCategories: string[] = [],
): Pick<ResolvedRestrictions, "restrictions" | "restrictionNames" | "restrictedCategories"> {
  return {
    restrictions: restricted.map((item) => item.id).filter(isIngredientUuid),
    restrictionNames: Object.fromEntries(
      restricted.filter((item) => isIngredientUuid(item.id)).map((item) => [item.id, item.name]),
    ),
    restrictedCategories: uniqueLower(restrictedCategories),
  }
}

export function restrictionMatchFromDetails(
  details: Record<string, unknown> | null | undefined,
): RestrictionMatchInput {
  const d = details ?? {}
  const restrictions = Array.isArray(d.restrictions) ? d.restrictions.map((id) => String(id)) : []
  const categories = Array.isArray(d.restrictedCategories)
    ? d.restrictedCategories.map((c) => String(c))
    : []
  return {
    restrictedIngredientIds: restrictions.filter(isIngredientUuid),
    restrictedCategories: uniqueLower(categories),
  }
}

export function recipeRestrictionFailReason(
  recipe: RestrictionRecipe,
  match: RestrictionMatchInput,
): RestrictionFailReason | null {
  const cats = new Set(match.restrictedCategories.map((c) => c.trim().toLowerCase()).filter(Boolean))
  if (cats.size > 0 && cats.has((recipe.category ?? "").trim().toLowerCase())) {
    return "category"
  }
  const ids = new Set(match.restrictedIngredientIds.filter(isIngredientUuid))
  if (ids.size === 0) return null
  const blocked = (recipe.servings ?? []).some((serving) =>
    (serving.ingredients ?? []).some((ing) => {
      const id = typeof ing.id === "string" ? ing.id.trim() : ""
      return id.length > 0 && ids.has(id)
    }),
  )
  return blocked ? "ingredient" : null
}

export function recipePassesRestrictions(
  recipe: RestrictionRecipe,
  match: RestrictionMatchInput,
): boolean {
  return recipeRestrictionFailReason(recipe, match) === null
}

export function restrictionDisplayItems(
  details: Record<string, unknown> | null | undefined,
): { key: string; label: string }[] {
  const d = details ?? {}
  const match = restrictionMatchFromDetails(d)
  const names =
    d.restrictionNames && typeof d.restrictionNames === "object" && !Array.isArray(d.restrictionNames)
      ? (d.restrictionNames as Record<string, string>)
      : {}
  const items: { key: string; label: string }[] = []
  const seen = new Set<string>()
  const add = (key: string, label: string) => {
    const trimmed = label.trim()
    const dedupe = trimmed.toLowerCase()
    if (!trimmed || seen.has(dedupe)) return
    seen.add(dedupe)
    items.push({ key, label: trimmed })
  }
  for (const id of match.restrictedIngredientIds) {
    add(id, names[id] ?? id)
  }
  for (const category of match.restrictedCategories) {
    add(`cat:${category}`, categoryRestrictionLabel(category))
  }
  for (const [id, raw] of Object.entries(names)) {
    add(id, String(raw ?? ""))
  }
  return items
}

export function restrictionDisplayLabels(details: Record<string, unknown> | null | undefined): string[] {
  return restrictionDisplayItems(details).map((item) => item.label)
}

function matchCategoryToken(token: string): string | null {
  const collapsed = collapseWs(token)
  if (!collapsed) return null
  const alias = CATEGORY_ALIASES[collapsed]
  if (alias) return alias
  const known = knownRecipeCategories()
  if (known.has(collapsed)) return collapsed
  const byLabel = MENU_CATEGORIES.find((c) => collapseWs(c.label) === collapsed)
  return byLabel ? byLabel.value : null
}

function stripRestrictionPrefix(token: string): string {
  return collapseWs(token).replace(/^(no|without|avoid|skip)(\s+eat)?\s+/, "")
}

function splitRestrictionTokens(value: string): string[] {
  return value
    .split(/[;|,]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function resolveRestrictionLabels(
  labels: string[],
  ingredientsByName: Map<string, IngredientRef>,
  options: { ingredientsById?: Map<string, IngredientRef> } = {},
): ResolvedRestrictions {
  const restrictions: string[] = []
  const restrictionNames: Record<string, string> = {}
  const categories: string[] = []
  const leftovers: string[] = []
  const usedIds = new Set<string>()
  const usedCats = new Set<string>()
  const usedLeftovers = new Set<string>()

  const addIngredient = (ref: IngredientRef) => {
    if (usedIds.has(ref.id)) return
    usedIds.add(ref.id)
    restrictions.push(ref.id)
    restrictionNames[ref.id] = ref.name
  }

  const addCategory = (category: string) => {
    if (usedCats.has(category)) return
    usedCats.add(category)
    categories.push(category)
  }

  const addLeftover = (label: string) => {
    const key = label.trim().toLowerCase()
    if (!key || usedLeftovers.has(key)) return
    usedLeftovers.add(key)
    leftovers.push(label.trim())
  }

  const lookupName = (name: string): IngredientRef | undefined => {
    const direct = ingredientsByName.get(collapseWs(name))
    if (direct) return direct
    return ingredientsByName.get(name.trim().toLowerCase())
  }

  for (const raw of labels) {
    for (const token of splitRestrictionTokens(raw)) {
      if (isIngredientUuid(token)) {
        const ref = options.ingredientsById?.get(token) ?? lookupName(token)
        addIngredient(ref ?? { id: token, name: token })
        continue
      }

      const stripped = stripRestrictionPrefix(token)
      const asCategory = matchCategoryToken(token) ?? matchCategoryToken(stripped)
      if (asCategory) {
        addCategory(asCategory)
        continue
      }

      const ingredient = lookupName(token) ?? lookupName(stripped)
      if (ingredient) {
        addIngredient(ingredient)
        continue
      }

      const aliasNames = INGREDIENT_ALIASES[stripped] ?? INGREDIENT_ALIASES[collapseWs(token)]
      if (aliasNames) {
        let matched = false
        for (const name of aliasNames) {
          const aliased = lookupName(name)
          if (aliased) {
            addIngredient(aliased)
            matched = true
          }
        }
        if (matched) continue
      }

      addLeftover(token)
    }
  }

  return {
    restrictions,
    restrictionNames,
    restrictedCategories: categories,
    leftovers,
  }
}

export function storedRestrictionLabels(details: Record<string, unknown> | null | undefined): string[] {
  const d = details ?? {}
  const ids = Array.isArray(d.restrictions) ? d.restrictions.map((id) => String(id)) : []
  const names =
    d.restrictionNames && typeof d.restrictionNames === "object" && !Array.isArray(d.restrictionNames)
      ? (d.restrictionNames as Record<string, string>)
      : {}
  const labels: string[] = []
  const seen = new Set<string>()
  const add = (label: string) => {
    const trimmed = label.trim()
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key)) return
    seen.add(key)
    labels.push(trimmed)
  }
  for (const id of ids) {
    if (isIngredientUuid(id)) add(id)
    else add(names[id] ?? id.replace(/^csv:/i, "").replace(/-/g, " "))
  }
  for (const [key, value] of Object.entries(names)) {
    if (ids.includes(key)) continue
    add(String(value ?? ""))
  }
  return labels
}

export function appendRestrictionLeftoversToNotes(
  notes: string | null | undefined,
  leftovers: string[],
): string | null {
  if (leftovers.length === 0) return notes?.trim() ? notes : null
  const existing = (notes ?? "").trim()
  const extra = leftovers.filter((item) => !existing.toLowerCase().includes(item.trim().toLowerCase()))
  if (extra.length === 0) return existing || null
  return [existing, extra.join("; ")].filter(Boolean).join("\n")
}

export function remapStoredRestrictionDetails(
  details: Record<string, unknown> | null | undefined,
  ingredientsByName: Map<string, IngredientRef>,
  ingredientsById?: Map<string, IngredientRef>,
): { next: Record<string, unknown>; changed: boolean } {
  const current = { ...(details ?? {}) }
  const existingCats = Array.isArray(current.restrictedCategories)
    ? current.restrictedCategories.map((c) => String(c))
    : []
  const resolved = resolveRestrictionLabels(storedRestrictionLabels(current), ingredientsByName, {
    ingredientsById,
  })
  const restrictedCategories = uniqueLower([...existingCats, ...resolved.restrictedCategories])
  const notes = appendRestrictionLeftoversToNotes(
    typeof current.notes === "string" ? current.notes : null,
    resolved.leftovers,
  )
  const next: Record<string, unknown> = {
    ...current,
    restrictions: resolved.restrictions,
    restrictionNames: resolved.restrictionNames,
    restrictedCategories,
  }
  if (notes) next.notes = notes
  else if (!current.notes) delete next.notes

  const changed =
    JSON.stringify(current.restrictions ?? []) !== JSON.stringify(next.restrictions) ||
    JSON.stringify(current.restrictionNames ?? {}) !== JSON.stringify(next.restrictionNames) ||
    JSON.stringify(uniqueLower(existingCats)) !== JSON.stringify(next.restrictedCategories) ||
    String(current.notes ?? "") !== String(next.notes ?? "")
  return { next, changed }
}
