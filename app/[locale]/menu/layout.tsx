import type { Metadata } from "next";
import { localeUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr ? "قائمة مطعم كوك كونكت عجمان" : "Restaurant Menu | CookConnect Ajman";
  const description = isAr
    ? "تصفح قائمة مطعم كوك كونكت في عجمان — dine-in وتوصيل واستلام واشتراكات. رشّح حسب الفئة والسعرات والسعر."
    : "Browse the CookConnect Restaurant menu in Ajman — dine-in, delivery & pickup, plus subscriptions. Filter by category, calories and price.";
  const canonical = localeUrl(locale, "/menu");
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: localeUrl("en", "/menu"),
        ar: localeUrl("ar", "/menu"),
        "x-default": localeUrl("en", "/menu"),
      },
    },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
