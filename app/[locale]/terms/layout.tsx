import type { Metadata } from "next";
import { localeUrl, ogImage } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr ? "اتفاقية خدمة اشتراك الوجبات | كوك كونكت" : "Meal Plan Service Agreement | CookConnect";
  const description = isAr
    ? "شروط اشتراك الوجبات في كوك كونكت: الدفع والتوصيل والإيقاف المؤقت أو إعادة الجدولة وحساسية الطعام والاسترداد والإلغاء للمشتركين."
    : "CookConnect's meal plan terms: payment, delivery, pausing or rescheduling, food allergies, refunds and cancellations for subscribers.";
  const canonical = localeUrl(locale, "/terms");
  const image = ogImage(locale);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical, languages: { en: localeUrl("en", "/terms"), ar: localeUrl("ar", "/terms"), "x-default": localeUrl("en", "/terms") } },
    openGraph: { title, description, url: canonical, type: "website", siteName: "CookConnect", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
export default function TermsLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
