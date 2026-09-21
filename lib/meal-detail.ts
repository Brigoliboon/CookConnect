import type { MenuItem, MealServingOption, MenuCategory } from "@/constants";

export interface DialogSourceMeal {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servings: MealServingOption[];
}

/** Convert lightweight card data (FeaturedMeals / MenuClient) to full MenuItem for MealDetailDialog. */
export function toDialogMeal(item: DialogSourceMeal): MenuItem {
  return {
    id: item.id,
    name: item.name,
    category: (item.category as MenuCategory) ?? "beef",
    description: item.description,
    price: item.price,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fats: item.fats,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    ingredients: [],
    image_path: item.image,
    servings: item.servings,
  };
}
