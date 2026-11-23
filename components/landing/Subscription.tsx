"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { motion } from "framer-motion"
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/constants"
import { translateContent } from "@/constants/translations"
import { Link } from "@/i18n/navigation"

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

function PlanCard({
  plan,
  locale,
  t,
  className = "",
}: {
  plan: SubscriptionPlan
  locale: string
  t: ReturnType<typeof useTranslations>
  className?: string
}) {
  const isHealthy = plan.type === "healthy"
  return (
    <div
      className={`group relative flex flex-col rounded-3xl border p-8 transition-all duration-500 ${
        isHealthy
          ? "border-transparent bg-gradient-to-br from-brand-900 to-[#0d6e3f] text-white shadow-xl [background-image:url(/healthy_sub-banner.png),linear-gradient(to_bottom_right,var(--tw-gradient-from),var(--tw-gradient-to))] bg-cover bg-no-repeat bg-right"
          : "border-neutral-200 bg-white text-black hover:border-black/30 hover:shadow-lg"
      } ${className}`}
    >
      {isHealthy && (
        <span className="absolute -top-3 left-8 rounded-full bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-black">
          {t("recommended")}
        </span>
      )}
      <p className="font-playfair text-3xl font-medium">{translateContent(plan.name, locale)}</p>
      <p className={`font-nunito mt-2 text-sm ${isHealthy ? "text-white/50" : "text-black/40"}`}>{translateContent(plan.description, locale)}</p>
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
          href={`/subscription-onboarding?plan=${plan.id}`}
          className={`font-nunito flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold transition-all duration-300 ${
            isHealthy
              ? "bg-white text-brand-900 hover:bg-neutral-100"
              : "bg-black text-white hover:bg-neutral-800"
          }`}
        >
          {t("contactSales")}
        </Link>
      </div>
    </div>
  )
}

export function Subscription() {
  const t = useTranslations("subscription")
  const galleryT = useTranslations("gallery")
  const locale = useLocale()
  const plans = SUBSCRIPTION_PLANS
  const healthyIndex = Math.max(0, plans.findIndex((plan) => plan.type === "healthy"))
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(healthyIndex)

  const updateActive = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const center = track.scrollLeft + track.clientWidth / 2
    let nearest = 0
    let min = Infinity
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const distance = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center)
      if (distance < min) {
        min = distance
        nearest = i
      }
    })
    setActiveIndex((prev) => (prev === nearest ? prev : nearest))
  }, [])

  const centerOn = useCallback((index: number, behavior: ScrollBehavior) => {
    const track = trackRef.current
    const el = itemRefs.current[index]
    if (!track || !el || track.clientWidth === 0) return
    track.scrollTo({
      left: el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2,
      behavior,
    })
  }, [])

  useEffect(() => {
    centerOn(healthyIndex, "auto")
    updateActive()
    window.addEventListener("resize", updateActive)
    return () => window.removeEventListener("resize", updateActive)
  }, [centerOn, healthyIndex, updateActive])

  const goTo = useCallback((index: number) => centerOn(index, "smooth"), [centerOn])

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

        <div className="mt-20 hidden flex-col items-center gap-6 md:flex md:flex-row md:flex-wrap md:justify-center">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              variants={fadeUp}
              custom={i + 1}
              className="flex w-full max-w-[280px] flex-1"
            >
              <PlanCard plan={plan} locale={locale} t={t} className="w-full" />
            </motion.div>
          ))}
        </div>

        <div className="mt-14 md:hidden">
          <div className="relative -mx-6">
            <div
              ref={trackRef}
              onScroll={updateActive}
              className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[10%] pb-6 pt-6"
            >
              {plans.map((plan, i) => (
                <div
                  key={plan.id}
                  ref={(el) => {
                    itemRefs.current[i] = el
                  }}
                  className={`w-[80%] shrink-0 snap-center transition-all duration-300 ease-out ${
                    activeIndex === i ? "scale-100 opacity-100" : "scale-90 opacity-80"
                  }`}
                >
                  <motion.div variants={fadeUp} custom={i + 1} className="h-full">
                    <PlanCard plan={plan} locale={locale} t={t} className="h-full" />
                  </motion.div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label={galleryT("prev")}
              className="absolute inset-y-0 left-0 z-10 w-[10%] bg-transparent"
            />
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex === plans.length - 1}
              aria-label={galleryT("next")}
              className="absolute inset-y-0 right-0 z-10 w-[10%] bg-transparent"
            />
          </div>

          <div className="mt-2 flex items-center justify-center gap-1">
            {plans.map((plan, i) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={translateContent(plan.name, locale)}
                aria-current={activeIndex === i ? "true" : undefined}
                className="p-1.5"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    activeIndex === i ? "w-6 bg-black" : "w-1.5 bg-black/20"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
