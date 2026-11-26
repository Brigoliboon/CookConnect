"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

export function HealthyCampaign() {
  const t = useTranslations("healthy")

  return (
    <section id="diet" className="overflow-hidden px-8 py-32 max-sm:px-4 max-sm:py-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mx-auto max-w-5xl"
      >
        <motion.p
          variants={fadeUp}
          custom={1}
          className="font-nunito mt-6 text-center text-base text-black/40 max-sm:text-sm"
        >
          {t("tagline")}
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={2}
          className="relative mt-12 flex items-center overflow-visible rounded-[2rem] bg-gradient-to-br from-brand-900 to-[#0d6e3f] px-12 py-14 max-sm:px-6 max-sm:py-10"
        >
          <div className="relative z-10 w-[55%] max-sm:w-full">
            <h2 className="font-nunito text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl max-sm:text-2xl">
              {t("campaignTitle")}
            </h2>
            <p className="font-nunito mt-4 max-w-sm text-base leading-relaxed text-white/60 max-sm:text-sm">
              {t("campaignBody")}
            </p>
            <a
              href="#subscription"
              className="font-nunito mt-6 inline-flex items-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              {t("campaignCta")}
            </a>
          </div>

          <div className="absolute bottom-0 right-0 top-0 z-0 flex w-[55%] items-end justify-end overflow-visible max-sm:hidden">
            <Image
              src="/health-section.png"
              alt={t("imgAlt")}
              width={720}
              height={492}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 640px) 0vw, 45vw"
              quality={70}
              className="mr-[-10%] h-[130%] w-auto translate-y-[5%] object-contain drop-shadow-2xl max-sm:mr-[-20%] max-sm:h-[100%]"
            />
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={3} className="mt-24 max-sm:mt-16">
          <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
            {t("sectionLabel")}
          </span>
          <h3 className="font-playfair mt-4 text-4xl font-medium leading-tight text-black sm:text-5xl max-sm:text-3xl">
            {t("didYouKnow")}
          </h3>
          <div className="mt-6 h-px w-12 bg-black/20" />
          <div className="mt-10 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-6 rounded-xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:flex-row">
              <Image
                src="/healthy-section/section-1.png"
                alt=""
                width={128}
                height={192}
                loading="lazy"
                decoding="async"
                sizes="128px"
                quality={70}
                className="w-32 h-48 shrink-0 rounded object-cover max-sm:w-24 max-sm:h-36"
              />
              <p className="font-nunito text-xl leading-loose text-black/50 max-sm:text-lg">{t("fact1")}</p>
            </div>
            <div className="flex flex-col items-center gap-6 rounded-xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:flex-row">
              <Image
                src="/healthy-section/section-2.png"
                alt=""
                width={128}
                height={192}
                loading="lazy"
                decoding="async"
                sizes="128px"
                quality={70}
                className="w-32 h-48 shrink-0 rounded object-cover max-sm:w-24 max-sm:h-36"
              />
              <p className="font-nunito text-xl leading-loose text-black/50 max-sm:text-lg">{t("fact2")}</p>
            </div>
            <div className="flex flex-col items-center gap-6 rounded-xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:flex-row">
              <Image
                src="/healthy-section/section-3.png"
                alt=""
                width={128}
                height={192}
                loading="lazy"
                decoding="async"
                sizes="128px"
                quality={70}
                className="w-32 h-48 shrink-0 rounded object-cover max-sm:w-24 max-sm:h-36"
              />
              <p className="font-nunito text-xl leading-loose text-black/50 max-sm:text-lg">{t("fact3")}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
