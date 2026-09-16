import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { listRecipes } from "@/lib/supabase/tables/recipes";
import { SITE_URL, localeUrl } from "@/lib/seo";
import { toMenuItem } from "@/lib/menu-map";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { CategoryMealCard } from "@/components/landing/CategoryMealCard";
import type { MenuItem } from "../MenuClient";

interface CategoryDef {
  db: string[];
  labelEn: string;
  labelAr: string;
}

export const CATEGORY_PAGES: Record<string, CategoryDef> = {
  meals: {
    db: ["beef", "chicken", "seafood", "soup", "breakfast", "biryani", "risotto", "vegetable"],
    labelEn: "Meals",
    labelAr: "الوجبات",
  },
  salad: { db: ["salad"], labelEn: "Salads", labelAr: "سلطة" },
  "rice-sides": { db: ["rice-sides"], labelEn: "Rice & Sides", labelAr: "أرز وأطباق جانبية" },
  platters: { db: ["platters"], labelEn: "Platters", labelAr: "أطباق" },
  pasta: { db: ["pasta"], labelEn: "Pasta", labelAr: "معكرونة" },
  wraps: { db: ["wrap"], labelEn: "Wraps", labelAr: "وربات" },
  pizza: { db: ["pizza"], labelEn: "Pizza", labelAr: "بيتزا" },
  burgers: { db: ["burgers"], labelEn: "Burgers", labelAr: "برجر وساندويتشات" },
  desserts: { db: ["desserts"], labelEn: "Desserts", labelAr: "حلويات" },
  drinks: { db: ["drinks", "smoothie", "juice", "beverages"], labelEn: "Drinks", labelAr: "مشروبات" },
};

async function fetchCategoryItems(slug: string, locale: string): Promise<MenuItem[]> {
  const def = CATEGORY_PAGES[slug];
  if (!def) return [];
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const res = await listRecipes(supabase, { isActive: true, limit: 100 });
  return res.data
    .filter((r) => def.db.includes(r.category ?? ""))
    .map((r) => toMenuItem(r, locale));
}

function titleFor(slug: string, locale: string): string {
  const def = CATEGORY_PAGES[slug];
  return locale === "ar"
    ? `${def.labelAr} في عجمان | مطعم كوك كونكت`
    : `${def.labelEn} in Ajman | CookConnect`;
}

function descFor(slug: string, locale: string): string {
  const def = CATEGORY_PAGES[slug];
  return locale === "ar"
    ? `${def.labelAr} طازجة في مطعم كوك كونكت عجمان — dine-in وتوصيل واستلام.`
    : `Fresh ${def.labelEn.toLowerCase()} at CookConnect Restaurant Ajman — dine-in, delivery & pickup.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  const def = CATEGORY_PAGES[category];
  if (!def) return {};
  const canonical = localeUrl(locale, `/menu/${category}`);
  let items: MenuItem[] = [];
  try {
    items = await fetchCategoryItems(category, locale);
  } catch {
    items = [];
  }
  return {
    title: titleFor(category, locale),
    description: descFor(category, locale),
    robots: items.length > 0 ? { index: true, follow: true } : { index: false, follow: true },
    alternates: {
      canonical,
      languages: {
        en: localeUrl("en", `/menu/${category}`),
        ar: localeUrl("ar", `/menu/${category}`),
        "x-default": localeUrl("en", `/menu/${category}`),
      },
    },
    openGraph: {
      title: titleFor(category, locale),
      description: descFor(category, locale),
      url: canonical,
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  const def = CATEGORY_PAGES[category];
  if (!def) notFound();
  setRequestLocale(locale);

  let items: MenuItem[] = [];
  try {
    items = await fetchCategoryItems(category, locale);
  } catch {
    items = [];
  }

  const menuUrl = localeUrl(locale, "/menu");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: titleFor(category, locale),
    url: localeUrl(locale, `/menu/${category}`),
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "MenuItem",
        name: item.name,
        description: item.description || undefined,
        image: item.image.startsWith("http") ? item.image : `${SITE_URL}${item.image}`,
        url: localeUrl(locale, `/menu/${category}`),
        offers: {
          "@type": "Offer",
          price: item.price,
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Nav />
      <main className="min-h-screen bg-white px-4 pt-24 pb-16 sm:px-6">
        <p className="font-nunito text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
          {locale === "ar" ? "قائمتنا" : "Our Menu"}
        </p>
        <h1 className="font-playfair mt-3 text-3xl font-medium text-neutral-900 sm:text-4xl">
          {titleFor(category, locale)}
        </h1>
        <p className="font-nunito mt-2 text-sm text-neutral-500">{descFor(category, locale)}</p>
        <a
          href={menuUrl}
          className="font-nunito mt-4 inline-block border border-neutral-900 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          {locale === "ar" ? "عرض القائمة الكاملة" : "View Full Menu"}
        </a>
        {items.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <CategoryMealCard
                key={item.id}
                id={item.id}
                name={item.name}
                image={item.image}
                price={item.price}
                calories={item.calories}
              />
            ))}
          </ul>
        ) : (
          <p className="font-nunito mt-8 border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
            {locale === "ar" ? "لا توجد وجبات هنا بعد — قريباً." : "Nothing here yet — coming soon."}
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
