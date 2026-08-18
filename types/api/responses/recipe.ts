export interface RecipeIngredientResponse {
  name: string
  quantity_g: number
  unit: string | null
  nutrition: {
    fats_g: number
    carbs_g: number
    fiber_g: number
    sugar_g: number
    protein_g: number
    sodium_mg: number
    calories_per_100g: number
  } | null
  fatsecret_id: string | null
}

export interface RecipeServingResponse {
  id: string
  name: string | null
  price: number | null
  calories: number | null
  nutrition: {
    fats_g: number
    carbs_g: number
    fiber_g: number
    sugar_g: number
    protein_g: number
    sodium_mg: number
  } | null
  is_active: boolean
  created_at: string
  updated_at: string
  ingredients: RecipeIngredientResponse[]
}

export interface RecipeResponse {
  id: string
  name: string
  category: string | null
  description: string | null
  is_active: boolean
  image_path: string | null
  servings: RecipeServingResponse[]
}