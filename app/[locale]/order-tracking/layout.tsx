import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: { absolute: locale === "ar" ? "تتبع الطلب | كوك كونكت" : "Track Order | CookConnect" },
    robots: { index: false, follow: false },
  };
}
export default function TrackingLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
