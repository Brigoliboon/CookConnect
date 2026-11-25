import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { listRecipes } from "@/lib/supabase/tables/recipes";
import { SITE_URL, localeUrl, ogImage, nutritionJsonLd } from "@/lib/seo";
import { toMenuItem } from "@/lib/menu-map";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { CategoryClient } from "./CategoryClient";
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
  salad: { db: ["salad"], labelEn: "Salads", labelAr: "سلطات" },
  "rice-sides": { db: ["rice-sides"], labelEn: "Rice & Sides", labelAr: "أرز وأطباق جانبية" },
  platters: { db: ["platters"], labelEn: "Platters", labelAr: "أطباق" },
  pasta: { db: ["pasta"], labelEn: "Pasta", labelAr: "معكرونة" },
  wraps: { db: ["wrap"], labelEn: "Wraps", labelAr: "راب" },
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
  const res = await listRecipes(supabase, { isActive: true, categories: def.db });
  return res.data.map((r) => toMenuItem(r, locale));
}

const CATEGORY_SEO = {
  "meals": { enTitle: "Chicken, Beef & Seafood Meals in Ajman | CookConnect", arTitle: "وجبات دجاج ولحم وبحريات في عجمان | كوك كونكت", enDescription: "Order chicken, beef and seafood meals, biryani, risotto, soups and breakfast from CookConnect in Ajman. Dine in, delivery or pickup.", arDescription: "اطلب وجبات الدجاج واللحم والمأكولات البحرية والبرياني والريزوتو والشوربة والفطور من كوك كونكت في عجمان. في المطعم أو توصيل أو استلام." },
  "salad": { enTitle: "Fresh Salads in Ajman: Delivery & Pickup | CookConnect", arTitle: "سلطات طازجة في عجمان: توصيل واستلام | كوك كونكت", enDescription: "Greek, quinoa, Caesar, tuna and avocado salads made fresh at CookConnect in Al Hamidiya, Ajman. Dine in or order delivery or pickup.", arDescription: "سلطة يونانية وكينوا وسيزر وتونة وأفوكادو تُحضَّر طازجة في كوك كونكت بالحميدية، عجمان. تناولها في المطعم أو اطلب التوصيل أو الاستلام." },
  "rice-sides": { enTitle: "Rice & Side Dishes in Ajman | CookConnect", arTitle: "أرز وأطباق جانبية في عجمان | كوك كونكت", enDescription: "Add white, brown or yellow rice, quinoa, grilled or sweet potato, cooked vegetables and more to your CookConnect order in Ajman.", arDescription: "أضف إلى طلبك الأرز الأبيض أو البني أو الأصفر، أو الكينوا أو البطاطا المشوية أو الحلوة أو الخضار المطبوخة من كوك كونكت في عجمان." },
  "platters": { enTitle: "Healthy Food Platters in Ajman | CookConnect", arTitle: "أطباق صحية متكاملة في عجمان | كوك كونكت", enDescription: "Try CookConnect's chicken, salmon and healthy platters in Ajman. See the choices and prices, then dine in or order delivery or pickup.", arDescription: "جرّب أطباق الدجاج والسلمون والطبق الصحي من كوك كونكت في عجمان. اطّلع على الخيارات والأسعار، ثم تناولها في المطعم أو اطلب التوصيل." },
  "pasta": { enTitle: "Pasta in Ajman: Pesto, Alfredo & Lasagna | CookConnect", arTitle: "باستا في عجمان: بيستو وألفريدو ولازانيا | كوك كونكت", enDescription: "Pasta pesto, brown pasta Alfredo, Bolognese, lasagna and more from CookConnect in Ajman. Dine in or order for delivery or pickup.", arDescription: "باستا بالبيستو، وباستا سمراء ألفريدو، وبولونيز ولازانيا وغيرها من كوك كونكت في عجمان. تناولها في المطعم أو اطلب التوصيل أو الاستلام." },
  "wraps": { enTitle: "Chicken, Halloumi & Tuna Wraps in Ajman | CookConnect", arTitle: "راب دجاج وحلوم وتونة في عجمان | كوك كونكت", enDescription: "Chicken tikka, fajita, halloumi, tuna, beef steak and shrimp wraps from CookConnect in Ajman. Dine in or order delivery or pickup.", arDescription: "راب دجاج تكا وفاهيتا وحلوم وتونة وستيك لحم وروبيان من كوك كونكت في عجمان. تناوله في المطعم أو اطلب التوصيل أو الاستلام." },
  "pizza": { enTitle: "Pizza in Ajman: Delivery & Pickup | CookConnect", arTitle: "بيتزا في عجمان: توصيل واستلام | كوك كونكت", enDescription: "Margherita, vegetable, chicken, pepperoni, beef and shrimp pizza from CookConnect in Al Hamidiya, Ajman. Order delivery or pickup.", arDescription: "بيتزا مارغريتا وخضار ودجاج وبيبروني ولحم وروبيان من كوك كونكت في الحميدية، عجمان. اطلب التوصيل أو الاستلام." },
  "burgers": { enTitle: "Burgers & Sandwiches in Ajman | CookConnect", arTitle: "برجر وساندويتشات في عجمان | كوك كونكت", enDescription: "Chicken, beef and classic cheeseburgers, Philly steak, club sandwiches and more from CookConnect in Ajman. Delivery, pickup or dine in.", arDescription: "برجر دجاج ولحم وتشيز برجر وساندويتش فيلي ستيك وكلوب وغيرها من كوك كونكت في عجمان. توصيل أو استلام أو تناول في المطعم." },
  "desserts": { enTitle: "Cakes & Desserts in Ajman | CookConnect", arTitle: "كيك وحلويات في عجمان | كوك كونكت", enDescription: "Date cake, carrot cake, cheesecake, lemon cake and brownies from CookConnect in Ajman. See prices and order for delivery or pickup.", arDescription: "كيك التمر وكيك الجزر وتشيز كيك وكيك الليمون وبراونيز من كوك كونكت في عجمان. اطّلع على الأسعار واطلب التوصيل أو الاستلام." },
  "drinks": { enTitle: "Fresh Juices & Protein Shakes in Ajman | CookConnect", arTitle: "عصائر طازجة ومخفوقات بروتين في عجمان | كوك كونكت", enDescription: "Fresh juices, yogurt smoothies, protein shakes and zero-sugar soft drinks from CookConnect in Ajman. Order for delivery or pickup.", arDescription: "عصائر طازجة وسموثي بالزبادي ومخفوقات بروتين ومشروبات غازية دون سكر من كوك كونكت في عجمان. اطلب التوصيل أو الاستلام." },
} as const;

function titleFor(slug: string, locale: string): string {
  const item = CATEGORY_SEO[slug as keyof typeof CATEGORY_SEO];
  return locale === "ar" ? item.arTitle : item.enTitle;
}

function headingFor(slug: string, locale: string): string {
  return titleFor(slug, locale).replace(/\s\|\s(?:CookConnect|كوك كونكت)$/, "");
}

function descFor(slug: string, locale: string): string {
  const item = CATEGORY_SEO[slug as keyof typeof CATEGORY_SEO];
  return locale === "ar" ? item.arDescription : item.enDescription;
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
  let failed = false;
  try {
    items = await fetchCategoryItems(category, locale);
  } catch {
    failed = true;
  }
  const title = titleFor(category, locale);
  const description = descFor(category, locale);
  const image = ogImage(locale);
  return {
    title: { absolute: title },
    description,
    robots: failed || items.length > 0 ? { index: true, follow: true } : { index: false, follow: true },
    alternates: {
      canonical,
      languages: {
        en: localeUrl("en", `/menu/${category}`),
        ar: localeUrl("ar", `/menu/${category}`),
        "x-default": localeUrl("en", `/menu/${category}`),
      },
    },
    openGraph: {
      title, description, url: canonical, type: "website", siteName: "CookConnect",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
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
        nutrition: nutritionJsonLd(item),
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
      <main className="min-h-screen bg-white px-4 pb-16 pt-20 sm:px-6">
        <CategoryClient
          items={items}
          title={headingFor(category, locale)}
          emptyLabel={locale === "ar" ? "لا توجد وجبات هنا بعد — قريباً." : "Nothing here yet — coming soon."}
        />
      </main>
      <Footer />
    </>
  );
}
