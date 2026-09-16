import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { Providers } from "../providers";
import { GEO, OG_IMAGE, SITE_META, SITE_URL, localeUrl } from "@/lib/seo";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#118B50",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  const meta = isAr ? SITE_META.ar : SITE_META.en;
  const canonical = localeUrl(locale, "/");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: meta.title, template: `%s | CookConnect` },
    description: meta.description,
    keywords: [...meta.keywords],
    authors: [{ name: "Cook Connect Restaurant LLC" }],
    creator: "CookConnect",
    publisher: "Cook Connect Restaurant LLC",
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      languages: {
        en: localeUrl("en", "/"),
        ar: localeUrl("ar", "/"),
        "x-default": localeUrl("en", "/"),
      },
    },
    openGraph: {
      type: "website",
      locale: isAr ? "ar_AE" : "en_AE",
      alternateLocale: isAr ? ["en_AE"] : ["ar_AE"],
      url: canonical,
      siteName: "CookConnect",
      title: meta.title,
      description: meta.description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "CookConnect" }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [OG_IMAGE],
    },
    icons: { icon: "/favicon.svg", apple: "/logo-horizontal.png" },
    manifest: "/manifest.webmanifest",
    category: "food",
    other: {
      "geo.region": GEO.region,
      "geo.placename": GEO.placename,
      "geo.position": `${GEO.lat};${GEO.lng}`,
      ICBM: `${GEO.lat}, ${GEO.lng}`,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}