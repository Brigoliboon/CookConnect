import type { Metadata } from "next";
import { localeUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr ? "سياسة الخصوصية | كوك كونكت" : "Privacy Policy | CookConnect";
  const canonical = localeUrl(locale, "/privacy");
  return {
    title,
    alternates: {
      canonical,
      languages: {
        en: localeUrl("en", "/privacy"),
        ar: localeUrl("ar", "/privacy"),
        "x-default": localeUrl("en", "/privacy"),
      },
    },
  };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
