import { translateContent } from "@/constants/translations";
import type { MealServingOption } from "@/constants";
import type { RecipeWithServings } from "@/lib/supabase/tables/recipes";
import type { MenuItem } from "@/app/[locale]/menu/MenuClient";

export const fallbackImages: Record<string, string> = {
  beef: "/placeholder/empty_plate.svg",
  chicken: "/placeholder/empty_plate.svg",
  seafood: "/placeholder/empty_plate.svg",
  salad: "/placeholder/empt_salad_bowl.png",
  wrap: "/placeholder/empty_plate.svg",
  breakfast: "/placeholder/empty_bowl.png",
  pasta: "/placeholder/empty_plate.svg",
  soup: "/placeholder/empty_bowl.png",
  pizza: "/placeholder/empty_plate.svg",
  burgers: "/placeholder/empty_plate.svg",
  drinks: "/drink_sample.svg",
  biryani: "/placeholder/empty_plate.svg",
  risotto: "/placeholder/empty_plate.svg",
  smoothie: "/drink_sample.svg",
  juice: "/drink_sample.svg",
  beverages: "/drink_sample.svg",
  desserts: "/drink_sample.svg",
  "rice-sides": "/placeholder/empty_plate.svg",
  platters: "/drink_sample.svg",
  vegetable: "/placeholder/empty_plate.svg",
};

export function toMenuItem(r: RecipeWithServings, locale: string): MenuItem {
  const servings = (r.servings ?? [])
    .filter((s) => s.is_active !== false)
    .map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      calories: s.calories,
      nutrition: s.nutrition as MealServingOption["nutrition"],
      is_active: s.is_active,
    }));
  const first = servings[0];
  const nutrition = first?.nutrition;
  return {
    id: r.id,
    name: translateContent(r.name ?? "", locale),
    category: r.category ?? "",
    description: translateContent(r.description ?? "", locale),
    image: r.image_path ?? fallbackImages[r.category ?? ""] ?? "/drink_sample.svg",
    price: first?.price ?? 0,
    calories: first?.calories ?? 0,
    protein: nutrition?.protein_g ?? 0,
    carbs: nutrition?.carbs_g ?? 0,
    fats: nutrition?.fats_g ?? 0,
    servings,
  };
}
