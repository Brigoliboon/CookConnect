import type { Metadata } from "next";
import { localeUrl, ogImage } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr ? "سياسة الخصوصية | كوك كونكت" : "Privacy Policy | CookConnect";
  const description = isAr
    ? "كيف تجمع كوك كونكت معلوماتك الشخصية وتستخدمها وتشاركها وتحميها عند الطلب أو إرسال استفسار أو الاشتراك في خطة وجبات."
    : "How CookConnect collects, uses, shares and protects your personal information when you order, send an inquiry or subscribe to a meal plan.";
  const canonical = localeUrl(locale, "/privacy");
  const image = ogImage(locale);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical, languages: { en: localeUrl("en", "/privacy"), ar: localeUrl("ar", "/privacy"), "x-default": localeUrl("en", "/privacy") } },
    openGraph: { title, description, url: canonical, type: "website", siteName: "CookConnect", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
export default function PrivacyLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
