"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

const CATEGORY_SLUGS = [
  "meals",
  "salad",
  "rice-sides",
  "platters",
  "pasta",
  "wraps",
  "pizza",
  "burgers",
  "desserts",
  "drinks",
] as const

export function Footer() {
  const t = useTranslations("footer")
  const tc = useTranslations("featured")

  return (
    <footer className="border-t border-neutral-200 bg-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-playfair text-lg font-bold text-black">{t("brand")}</p>
            <p className="font-nunito mt-2 text-sm text-black/50">
              {t("tagline")}
            </p>
          </div>
          <div>
            <p className="font-nunito text-sm font-semibold text-black">{t("quickLinks")}</p>
            <div className="font-nunito mt-3 space-y-2 text-sm text-black/50">
              <Link href="/menu" className="block transition-colors hover:text-black">{t("menu")}</Link>
              <Link href="/#subscription" className="block transition-colors hover:text-black">{t("pricing")}</Link>
              <Link href="/#about" className="block transition-colors hover:text-black">{t("about")}</Link>
              <Link href="/#contact" className="block transition-colors hover:text-black">{t("contact")}</Link>
              <Link href="/terms" className="block transition-colors hover:text-black">{t("terms")}</Link>
              <Link href="/privacy" className="block transition-colors hover:text-black">{t("privacy")}</Link>
            </div>
          </div>
          <div>
            <p className="font-nunito text-sm font-semibold text-black">{t("categories")}</p>
            <div className="font-nunito mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-black/50">
              {CATEGORY_SLUGS.map((slug) => (
                <Link key={slug} href={`/menu/${slug}`} className="transition-colors hover:text-black">
                  {tc(`cats.${slug}`)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-nunito text-sm font-semibold text-black">{t("contact")}</p>
            <address className="font-nunito mt-3 space-y-2 text-sm not-italic text-black/50">
              <p>Sheikh Zayed Street, Al Hamidiya 1, Ajman, UAE</p>
              <p><a href="tel:+971563356051" className="transition-colors hover:text-black">+971 56 335 6051</a></p>
              <p><a href="mailto:cookconnectrestaurant@gmail.com" className="transition-colors hover:text-black">cookconnectrestaurant@gmail.com</a></p>
              <p>Sat–Thu, 8:00 AM – 10:00 PM</p>
            </address>
            <div className="mt-4 flex gap-4 text-sm">
              <a href="https://www.instagram.com/cookconnectrestaurant" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-black/50 transition-colors hover:text-black">Instagram</a>
              <a href="https://www.facebook.com/cookConnectLLC" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-black/50 transition-colors hover:text-black">Facebook</a>
              <a href="https://wa.me/971563356051" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-black/50 transition-colors hover:text-black">WhatsApp</a>
            </div>
          </div>
        </div>
        <div className="font-nunito mt-10 border-t border-neutral-200 pt-6 text-center text-xs text-black/40">
          <p>&copy; {new Date().getFullYear()} {t("copyright")}</p>
          <p className="mt-2 font-semibold text-black/80">
            {t("loveWhatYouSee")}{" "}
            <a
              href="https://www.boonbrigoli.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-black hover:underline"
            >
              {t("contactDev")}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}