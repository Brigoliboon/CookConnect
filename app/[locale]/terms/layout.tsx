import type { Metadata } from "next";
import { localeUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr ? "اتفاقية الخدمة | كوك كونكت" : "Service Agreement | CookConnect";
  const canonical = localeUrl(locale, "/terms");
  return {
    title,
    alternates: {
      canonical,
      languages: {
        en: localeUrl("en", "/terms"),
        ar: localeUrl("ar", "/terms"),
        "x-default": localeUrl("en", "/terms"),
      },
    },
  };
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
