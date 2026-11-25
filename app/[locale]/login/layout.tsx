import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: { absolute: locale === "ar" ? "تسجيل الدخول | كوك كونكت" : "Sign In | CookConnect" },
    robots: { index: false, follow: false },
  };
}
export default function LoginLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
