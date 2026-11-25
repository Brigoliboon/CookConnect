import type { Metadata } from "next";
import { localeUrl, ogImage } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr
    ? "قائمة الأكل الصحي والأسعار في عجمان | كوك كونكت"
    : "Healthy Food Menu & Prices in Ajman | CookConnect";
  const description = isAr
    ? "تصفّح قائمة كوك كونكت وأسعارها: وجبات رئيسية وسلطات وباستا وراب وبيتزا وبرجر وحلويات ومشروبات. تناول في المطعم أو توصيل أو استلام في عجمان."
    : "See CookConnect's menu with prices: meals, salads, pasta, wraps, pizza, burgers, desserts and drinks. Dine in, delivery or pickup in Ajman.";
  const canonical = localeUrl(locale, "/menu");
  const image = ogImage(locale);
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: {
        en: localeUrl("en", "/menu"),
        ar: localeUrl("ar", "/menu"),
        "x-default": localeUrl("en", "/menu"),
      },
    },
    openGraph: {
      title, description, url: canonical, type: "website", siteName: "CookConnect",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
