export interface Subscription {
  id: string
  customerId: string
  customerName: string
  details: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface MealPlanDetail {
  mealsPerWeek: number
  servingsPerMeal: number
  dietaryPreference: string
  includedItems: string[]
  notes: string
}

export const SUBSCRIPTIONS: Subscription[] = [
  { id: "S-001", customerId: "C-001", customerName: "Maria Santos", details: { mealsPerWeek: 5, servingsPerMeal: 2, dietaryPreference: "any", notes: "No pork" }, createdAt: "2025-01-15", updatedAt: "2025-06-20" },
  { id: "S-002", customerId: "C-002", customerName: "Jose Garcia", details: { mealsPerWeek: 7, servingsPerMeal: 4, dietaryPreference: "high-protein", notes: "" }, createdAt: "2025-02-20", updatedAt: "2025-07-01" },
  { id: "S-003", customerId: "C-003", customerName: "Ana Cruz", details: { mealsPerWeek: 3, servingsPerMeal: 1, dietaryPreference: "vegetarian", notes: "No dairy" }, createdAt: "2025-03-10", updatedAt: "2025-03-10" },
  { id: "S-004", customerId: "C-004", customerName: "Pedro Reyes", details: { mealsPerWeek: 10, servingsPerMeal: 2, dietaryPreference: "any", notes: "Extra rice" }, createdAt: "2025-04-05", updatedAt: "2025-06-28" },
  { id: "S-005", customerId: "C-005", customerName: "Carla Jimenez", details: { mealsPerWeek: 5, servingsPerMeal: 2, dietaryPreference: "low-carb", notes: "No seafood" }, createdAt: "2025-05-12", updatedAt: "2025-07-15" },
]
