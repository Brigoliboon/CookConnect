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
            <address className="font-nunito mt-3 space-y-2 text-sm not-italic text-black/50">
              <p>Sheikh Zayed Street, Al Hamidiya 1, Ajman, UAE</p>
              <p><a href="tel:+971556634050" className="transition-colors hover:text-black">+971556634050</a></p>
              <p><a href="mailto:cookconnectrestaurant@gmail.com" className="transition-colors hover:text-black">cookconnectrestaurant@gmail.com</a></p>
              <p>Sat–Thu, 8:00 AM – 10:00 PM</p>
            </address>
            <div className="mt-4 flex gap-4 text-sm">
              <a href="https://www.instagram.com/cookconnectrestaurant" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-black/50 transition-colors hover:text-black">Instagram</a>
              <a href="https://www.facebook.com/cookConnectLLC" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-black/50 transition-colors hover:text-black">Facebook</a>
              <a href="https://wa.me/971556634050" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-black/50 transition-colors hover:text-black">WhatsApp</a>
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