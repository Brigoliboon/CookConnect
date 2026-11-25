import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { Footer } from "@/components/landing/Footer"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: "notFound" })
  return {
    title: { absolute: t("metaTitle") },
    description: t("description"),
  }
}

export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: "notFound" })

  return (
    <>
      <main className="flex min-h-[70vh] flex-col items-center justify-center bg-neutral-50 px-6 py-24 text-center">
        <Image src="/icon-192.png" alt="CookConnect" width={96} height={96} className="size-24 rounded-2xl shadow-sm" />
        <p className="font-nunito mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-brand-900/60">404</p>
        <h1 className="font-playfair mt-4 text-4xl font-medium text-neutral-900 sm:text-5xl">
          {t("title")}
        </h1>
        <p className="font-nunito mt-4 max-w-md text-sm leading-relaxed text-neutral-500">
          {t("description")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="font-nunito rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-400"
          >
            {t("backHome")}
          </Link>
          <Link
            href="/menu"
            className="font-nunito rounded-xl bg-brand-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-900/90"
          >
            {t("browseMenu")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
