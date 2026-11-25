import Link from "next/link"
import Image from "next/image"
import { cookies } from "next/headers"

export default async function NotFound() {
  const locale = (await cookies()).get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en"
  const copy =
    locale === "ar"
      ? {
          title: "هذه الصفحة ليست على القائمة.",
          description: "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
          home: "العودة إلى الرئيسية",
          menu: "تصفّح القائمة",
          menuHref: "/ar/menu",
          homeHref: "/ar",
        }
      : {
          title: "This page is off the menu.",
          description: "The page you are looking for does not exist or has moved.",
          home: "Back to home",
          menu: "Browse the menu",
          menuHref: "/menu",
          homeHref: "/",
        }

  return (
    <main
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={{
        alignItems: "center",
        background: "#faf7f1",
        color: "#1c1917",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <Image src="/icon-192.png" alt="CookConnect" width={96} height={96} style={{ borderRadius: 16 }} />
      <p style={{ color: "#118B50", fontSize: 12, fontWeight: 700, letterSpacing: "0.3em", marginTop: 32 }}>404</p>
      <h1 style={{ fontSize: 40, fontWeight: 500, margin: "16px 0 0" }}>{copy.title}</h1>
      <p style={{ color: "#78716c", fontSize: 14, lineHeight: 1.7, marginTop: 16, maxWidth: 420 }}>{copy.description}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
        <Link
          href={copy.homeHref}
          style={{ background: "#fff", border: "1px solid #d6d3d1", borderRadius: 12, color: "#292524", padding: "12px 24px", textDecoration: "none" }}
        >
          {copy.home}
        </Link>
        <Link
          href={copy.menuHref}
          style={{ background: "#118B50", borderRadius: 12, color: "#fff", padding: "12px 24px", textDecoration: "none" }}
        >
          {copy.menu}
        </Link>
      </div>
    </main>
  )
}
