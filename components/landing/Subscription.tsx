"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "framer-motion"
import { SUBSCRIPTION_PLANS } from "@/constants"
import { translateContent } from "@/constants/translations"
import { useLocale } from "next-intl"

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

export function Subscription() {
  const t = useTranslations("subscription")
  const locale = useLocale()

  return (
    <motion.section
      id="subscription"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="bg-neutral-50 px-6 py-32"
    >
      <div className="mx-auto max-w-8xl">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
            {t("eyebrow")}
          </span>
          <h2 className="font-playfair mt-4 text-5xl font-medium leading-tight text-black sm:text-6xl">
            {t("title")}
          </h2>
          <div className="mx-auto mt-6 h-px w-12 bg-black/20" />
          <p className="font-nunito mx-auto mt-6 max-w-md text-sm leading-relaxed text-black/50">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="mt-20 flex flex-wrap justify-center gap-6">
          {SUBSCRIPTION_PLANS.map((plan, i) => {
            const isHealthy = plan.type === "healthy"
            return (
              <motion.div
                key={plan.id}
                variants={fadeUp}
                custom={i + 1}
                className={`group relative flex w-72 flex-col rounded-3xl border p-8 transition-all duration-500 ${
                  isHealthy
                    ? "border-transparent bg-gradient-to-br from-brand-900 to-[#0d6e3f] text-white shadow-xl [background-image:url(/healthy_sub-banner.png),linear-gradient(to_bottom_right,var(--tw-gradient-from),var(--tw-gradient-to))] bg-cover bg-no-repeat bg-right"
                    : "border-neutral-200 bg-white text-black hover:border-black/30 hover:shadow-lg"
                }`}
              >
                {isHealthy && (
                  <span className="absolute -top-3 left-8 rounded-full bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-black">
                    {t("recommended")}
                  </span>
                )}
                <p className="font-playfair text-3xl font-medium">{translateContent(plan.name, locale)}</p>
                <p className={`font-nunito mt-2 text-sm ${isHealthy ? "text-white/50" : "text-black/40"}`}>{translateContent(plan.description, locale)}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-playfair text-5xl font-medium tracking-tight">{plan.priceAED}</span>
                  <span className={`font-nunito text-sm ${isHealthy ? "text-white/40" : "text-black/30"}`}>{t("currency")}</span>
                </div>
                <ul className={`font-nunito mt-6 space-y-3 text-sm ${isHealthy ? "text-white/70" : "text-black/50"}`}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <span className={`size-1 rounded-full ${isHealthy ? "bg-white/40" : "bg-black/30"}`} />
                      {translateContent(f, locale)}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Link
                    href="/login"
                    className={`font-nunito flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold transition-all duration-300 ${
                      isHealthy
                        ? "bg-white text-brand-900 hover:bg-neutral-100"
                        : "bg-black text-white hover:bg-neutral-800"
                    }`}
                  >
                    {t("cta")}
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}