"use client"

import { useTranslations } from "next-intl"

export function Footer() {
  const t = useTranslations("footer")

  return (
    <footer className="border-t border-neutral-200 bg-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-playfair text-lg font-bold text-black">{t("brand")}</p>
            <p className="font-nunito mt-2 text-sm text-black/50">
              {t("tagline")}
            </p>
          </div>
          <div>
            <p className="font-nunito text-sm font-semibold text-black">{t("quickLinks")}</p>
            <div className="font-nunito mt-3 space-y-2 text-sm text-black/50">
              <a href="#meals" className="block transition-colors hover:text-black">{t("menu")}</a>
              <a href="#subscription" className="block transition-colors hover:text-black">{t("pricing")}</a>
              <a href="#about" className="block transition-colors hover:text-black">{t("about")}</a>
              <a href="#contact" className="block transition-colors hover:text-black">{t("contact")}</a>
            </div>
          </div>
          <div>
            <p className="font-nunito text-sm font-semibold text-black">{t("contact")}</p>
            <div className="font-nunito mt-3 space-y-2 text-sm text-black/50">
              <p>cookconnectrestaurant@gmail.com</p>
              <p>+971556634050</p>
              <p>Dubai, UAE</p>
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