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

export interface RecipeResponse {
  id: string
  name: string
  category: string | null
  description: string | null
  price: number | null
  calories: number | null
  is_active: boolean
  nutrition: {
    fats_g: number
    carbs_g: number
    fiber_g: number
    sugar_g: number
    protein_g: number
    sodium_mg: number
  } | null
  image_path: string | null
  recipe_ingredients: {
    unit: string | null
    ingredient: {
      name: string
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
    quantity_g: number
  }[]
  ingredients: RecipeIngredientResponse[]
}
