import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { listRecipes } from "@/lib/supabase/tables/recipes";
import { decodeRecipeIds } from "@/utils/catalogShare";
import { SITE_URL, localeUrl } from "@/lib/seo";
import { toMenuItem } from "@/lib/menu-map";
import MenuClient, { type MenuItem } from "./MenuClient";

const PAGE_SIZE = 24;

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
