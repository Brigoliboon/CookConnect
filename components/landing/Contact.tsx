"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { MapPin, Phone, Mail, Clock } from "lucide-react"

const ContactMap = dynamic(() => import("@/components/landing/ContactMap").then((mod) => mod.ContactMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-full items-center justify-center rounded-2xl bg-neutral-100">
      <div className="size-8 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
    </div>
  ),
})

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

const inputClass =
  "font-nunito w-full border-b border-black/10 bg-transparent px-0 py-3 text-sm text-black outline-none transition-colors placeholder:text-black/20 focus:border-black"

export function Contact() {
  const t = useTranslations("contact")
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInView, setMapInView] = useState(
    () => typeof window === "undefined" || typeof IntersectionObserver === "undefined",
  )

  useEffect(() => {
    if (mapInView) return
    const el = mapRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMapInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [mapInView])

  const details = [
    { icon: MapPin, label: t("addressLabel"), value: "Sheikh Zayed Street, Al Hamidiya 1, Ajman, UAE" },
    { icon: Phone, label: t("phoneLabel"), value: "+971556634050" },
    { icon: Mail, label: t("emailLabel"), value: "cookconnectrestaurant@gmail.com" },
    { icon: Clock, label: t("hoursLabel"), value: "Sat–Thu, 8:00 AM – 10:00 PM" },
  ]

  return (
    <motion.section
      id="contact"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="bg-neutral-50 px-8 py-32"
    >
      <div className="flex flex-col gap-16 lg:flex-row">
        <motion.div variants={fadeUp} className="flex flex-col gap-6 lg:w-[55%]">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {details.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <d.icon size={15} className="mt-0.5 shrink-0 text-black/50" />
                <div>
                  <p className="font-nunito text-xs font-bold uppercase tracking-wider text-black/50">{d.label}</p>
                  <p className="font-nunito mt-0.5 text-sm font-medium text-black/80">{d.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div ref={mapRef} className="overflow-hidden rounded-2xl">
            {mapInView ? (
              <ContactMap />
            ) : (
              <div className="flex h-[360px] w-full items-center justify-center bg-neutral-100">
                <div className="size-8 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:w-[45%]">
          <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
            {t("eyebrow")}
          </span>
          <h2 className="font-playfair mt-4 text-5xl font-medium leading-tight text-black sm:text-6xl">
            {t("title")}
          </h2>
          <div className="mt-6 h-px w-12 bg-black/20" />
          <p className="font-nunito mt-6 text-sm leading-relaxed text-black/50">
            {t("subtitle")}
          </p>
          <form className="mt-10 space-y-8">
            <input type="text" placeholder={t("name")} className={inputClass} />
            <input type="email" placeholder={t("email")} className={inputClass} />
            <textarea rows={4} placeholder={t("message")} className={`${inputClass} resize-none`} />
            <button
              type="submit"
              className="font-nunito w-full rounded-xl bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-neutral-800"
            >
              {t("send")}
            </button>
          </form>
        </motion.div>
      </div>
    </motion.section>
  )
}