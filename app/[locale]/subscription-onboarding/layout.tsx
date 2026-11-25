import type { Metadata } from "next";
import { localeUrl, ogImage } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr ? "التسجيل في خطة الوجبات | كوك كونكت" : "Meal Plan Sign-Up | CookConnect";
  const description = isAr
    ? "أرسل طلب التسجيل في خطة الوجبات من كوك كونكت."
    : "Complete your CookConnect meal plan sign-up inquiry.";
  const canonical = localeUrl(locale, "/subscription-onboarding");
  const image = ogImage(locale);
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", siteName: "CookConnect", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function SubscriptionOnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
