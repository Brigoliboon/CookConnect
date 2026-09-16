import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { listRecipes, type RecipeWithServings } from "@/lib/supabase/tables/recipes";
import { translateContent } from "@/constants/translations";
import { decodeRecipeIds } from "@/utils/catalogShare";
import type { MealServingOption } from "@/constants";
import { SITE_URL, localeUrl } from "@/lib/seo";
import MenuClient, { type MenuItem } from "./MenuClient";

const PAGE_SIZE = 24;

const fallbackImages: Record<string, string> = {
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

function toMenuItem(r: RecipeWithServings, locale: string): MenuItem {
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

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const idsParam = typeof sp?.ids === "string" ? sp.ids : null;
  const checkout = sp?.checkout;
  const checkoutRequested = checkout === "true" || checkout === "1";
  const sharedIds = decodeRecipeIds(idsParam);

  let initialItems: MenuItem[] = [];
  let initialTotal = 0;
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const res = await listRecipes(supabase, {
      ids: sharedIds.length > 0 ? sharedIds : undefined,
      isActive: true,
      offset: 0,
      limit: PAGE_SIZE,
    });
    initialTotal = res.total;
    initialItems = res.data.map((r) => toMenuItem(r, locale));
  } catch {
    initialItems = [];
    initialTotal = 0;
  }

  const menuUrl = localeUrl(locale, "/menu");
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: locale === "ar" ? "قائمة مطعم كوك كونكت" : "CookConnect Restaurant Menu",
      url: menuUrl,
      numberOfItems: initialItems.length,
      itemListElement: initialItems.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "MenuItem",
          name: item.name,
          description: item.description || undefined,
          image: item.image.startsWith("http") ? item.image : `${SITE_URL}${item.image}`,
          url: menuUrl,
          offers: {
            "@type": "Offer",
            price: item.price,
            priceCurrency: "AED",
            availability: "https://schema.org/InStock",
          },
          nutrition: {
            "@type": "NutritionInformation",
            calories: `${item.calories} calories`,
            proteinContent: `${item.protein}g`,
            carbohydrateContent: `${item.carbs}g`,
            fatContent: `${item.fats}g`,
          },
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "OrderAction",
      name: locale === "ar" ? "اطلب الطعام" : "Order food",
      target: { "@type": "EntryPoint", urlTemplate: menuUrl },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <MenuClient
        initialItems={initialItems}
        initialTotal={initialTotal}
        idsParam={idsParam}
        checkoutRequested={checkoutRequested}
      />
    </>
  );
}
