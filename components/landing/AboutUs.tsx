"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

export function AboutUs() {
  const t = useTranslations("about")

  return (
    <motion.section
      id="about"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="bg-white px-6 py-32"
    >
      <div>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div variants={fadeUp} custom={0} className="overflow-hidden rounded-2xl">
            <img
              src="/landingpage/cook-connect-team.jpg"
              alt={t("imgAlt")}
              className="h-full w-full scale-125 object-cover"
            />
          </motion.div>
          <motion.div variants={fadeUp} custom={1}>
            <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
              {t("eyebrow")}
            </span>
            <h2 className="font-playfair mt-4 text-5xl font-medium leading-tight text-black sm:text-6xl lg:text-7xl">
              {t("title")}
            </h2>
            <div className="mt-8 h-px w-16 bg-black/20" />
            <p className="font-nunito mt-8 text-base leading-relaxed text-black/70">
              {t("p1Start")} <strong>{t("p1Strong")}</strong> {t("p1Mid")} <strong>{t("p1Strong2")}</strong> {t("p1End")}
            </p>
            <p className="font-nunito mt-5 text-base leading-relaxed text-black/70">
              {t("p2Start")} <strong>{t("p2Strong")}</strong> {t("p2Mid")} <strong>{t("p2Strong2")}</strong> {t("p2End")}
            </p>
            <p className="font-nunito mt-5 text-base leading-relaxed text-black/70">
              <strong>{t("p3Strong")}</strong> {t("p3Mid")} <strong>{t("p3Strong2")}</strong> {t("p3End")}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}