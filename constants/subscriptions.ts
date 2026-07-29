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
  goal: string
  goalOption: string
  customGoal: { calories: number; fats: number; carbs: number } | null
  mealTimes: string[]
  preferredCarb: string
  restrictions: string[]
  restrictionOther: string
  rotationMode: string
  deliveryTime: string
  includedMeals: string[]
  notes: string
}

export type PlanType = "standard" | "healthy"

export interface SubscriptionPlan {
  id: string
  name: string
  type: PlanType
  durationDays: number
  priceAED: number
  description: string
  features: string[]
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "standard-7",
    name: "7-Day Meal Plan",
    type: "standard",
    durationDays: 7,
    priceAED: 399,
    description: "For individuals who want choice and flexibility.",
    features: ["7-day meal plan", "Full menu access", "Macro preferences", "Priority support"],
  },
  {
    id: "standard-14",
    name: "14-Day Meal Plan",
    type: "standard",
    durationDays: 14,
    priceAED: 699,
    description: "For individuals who want choice and flexibility.",
    features: ["14-day meal plan", "Full menu access", "Macro preferences", "Priority support"],
  },
  {
    id: "healthy",
    name: "Healthy Diet Plan",
    type: "healthy",
    durationDays: 30,
    priceAED: 1099,
    description: "Curated clean-eating meals for a healthier you.",
    features: ["30-day meal plan", "Dietitian-approved menu", "Organic produce", "Macro-optimized meals", "Priority support"],
  },
  {
    id: "standard-26",
    name: "26-Day Meal Plan",
    type: "standard",
    durationDays: 26,
    priceAED: 999,
    description: "For individuals who want choice and flexibility.",
    features: ["26-day meal plan", "Full menu access", "Macro preferences", "Priority support"],
  },
  {
    id: "standard-30",
    name: "30-Day Meal Plan",
    type: "standard",
    durationDays: 30,
    priceAED: 1199,
    description: "For individuals who want choice and flexibility.",
    features: ["30-day meal plan", "Full menu access", "Macro preferences", "Priority support"],
  },
]

export const SUBSCRIPTIONS: Subscription[] = [
  { id: "S-001", customerId: "C-001", customerName: "Maria Santos", details: { mealsPerWeek: 5, servingsPerMeal: 2, goal: "balanced", goalOption: "", customGoal: null, mealTimes: ["breakfast", "lunch", "dinner"], preferredCarb: "white-rice", restrictions: ["no-pork"], restrictionOther: "", rotationMode: "chefs-choice", deliveryTime: "08:00", includedMeals: ["Grilled Lemon Herb Chicken", "Caesar Salad", "Spaghetti Bolognese"], notes: "" }, createdAt: "2025-01-15", updatedAt: "2025-06-20" },
  { id: "S-002", customerId: "C-002", customerName: "Jose Garcia", details: { mealsPerWeek: 7, servingsPerMeal: 4, goal: "high-protein", goalOption: "", customGoal: null, mealTimes: ["breakfast", "lunch", "afternoon-snack", "dinner"], preferredCarb: "brown-rice", restrictions: [], restrictionOther: "", rotationMode: "pre-select", deliveryTime: "12:00", includedMeals: ["Butter Chicken", "Teriyaki Chicken", "Beef Stir Fry", "Grilled Salmon"], notes: "" }, createdAt: "2025-02-20", updatedAt: "2025-07-01" },
  { id: "S-003", customerId: "C-003", customerName: "Ana Cruz", details: { mealsPerWeek: 3, servingsPerMeal: 1, goal: "vegetarian", goalOption: "", customGoal: null, mealTimes: ["lunch", "dinner"], preferredCarb: "mixed", restrictions: ["no-dairy"], restrictionOther: "", rotationMode: "chefs-choice", deliveryTime: "18:00", includedMeals: ["Falafel Wrap", "Greek Salad", "Pesto Penne"], notes: "No dairy" }, createdAt: "2025-03-10", updatedAt: "2025-03-10" },
  { id: "S-004", customerId: "C-004", customerName: "Pedro Reyes", details: { mealsPerWeek: 10, servingsPerMeal: 2, goal: "weight-loss", goalOption: "less-rice", customGoal: null, mealTimes: ["breakfast", "morning-snack", "lunch", "afternoon-snack", "dinner"], preferredCarb: "sweet-potato", restrictions: [], restrictionOther: "", rotationMode: "chefs-choice", deliveryTime: "07:30", includedMeals: ["Classic American Breakfast", "Chicken Caesar Wrap", "Pepper Steak", "Garlic Butter Shrimp", "Tomato Basil Soup"], notes: "Extra rice" }, createdAt: "2025-04-05", updatedAt: "2025-06-28" },
  { id: "S-005", customerId: "C-005", customerName: "Carla Jimenez", details: { mealsPerWeek: 5, servingsPerMeal: 2, goal: "customized", goalOption: "", customGoal: { calories: 1800, fats: 50, carbs: 150 }, mealTimes: ["lunch", "dinner"], preferredCarb: "brown-rice", restrictions: ["no-seafood"], restrictionOther: "", rotationMode: "pre-select", deliveryTime: "12:30", includedMeals: ["Grilled Salmon", "Greek Salad", "Lemon Pepper Chicken"], notes: "No seafood" }, createdAt: "2025-05-12", updatedAt: "2025-07-15" },
]
