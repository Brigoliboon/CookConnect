"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const tiers = [
  {
    name: "Standard",
    price: "899",
    desc: "For individuals who want choice and flexibility.",
    features: ["10 meals per week", "Full menu access", "Macro preferences", "Priority support"],
  },
  {
    name: "Healthy Plan",
    price: "1,099",
    desc: "Curated clean-eating meals for a healthier you.",
    features: ["10 meals per week", "Dietitian-approved menu", "Organic produce", "Macro-optimized meals", "Priority support"],
    healthy: true,
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

export function Subscription() {
  return (
    <motion.section
      id="subscription"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="bg-neutral-50 px-6 py-32"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div variants={fadeUp} custom={0} className="text-center">
          <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
            Pricing
          </span>
          <h2 className="font-playfair mt-4 text-5xl font-medium leading-tight text-black sm:text-6xl">
            Choose Your Plan
          </h2>
          <div className="mx-auto mt-6 h-px w-12 bg-black/20" />
          <p className="font-nunito mx-auto mt-6 max-w-md text-sm leading-relaxed text-black/50">
            Transparent pricing, no surprises. Change or cancel anytime.
          </p>
        </motion.div>

        <div className="mt-20 flex flex-col items-center gap-6 md:flex-row md:justify-center">
          {tiers.map((tier, i) => {
            const isHealthy = tier.healthy
            return (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                custom={i + 1}
                className={`group relative flex flex-col rounded-3xl border p-10 transition-all duration-500 ${
                  isHealthy
                    ? "border-transparent bg-gradient-to-br from-brand-900 to-[#0d6e3f] text-white shadow-xl"
                    : "border-neutral-200 bg-white text-black hover:border-black/30 hover:shadow-lg"
                }`}
              >
                {isHealthy && (
                  <span className="absolute -top-3 left-8 rounded-full bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-black">
                    Recommended
                  </span>
                )}
                <p className="font-playfair text-3xl font-medium">{tier.name}</p>
                <p className={`font-nunito mt-2 text-sm ${isHealthy ? "text-white/50" : "text-black/40"}`}>{tier.desc}</p>
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="font-playfair text-5xl font-medium tracking-tight">{tier.price}</span>
                  <span className={`font-nunito text-sm ${isHealthy ? "text-white/40" : "text-black/30"}`}>AED / month</span>
                </div>
                <ul className={`font-nunito mt-8 space-y-3 text-sm ${isHealthy ? "text-white/70" : "text-black/50"}`}>
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <span className={`size-1 rounded-full ${isHealthy ? "bg-white/40" : "bg-black/30"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <Link
                    href="/login"
                    className={`font-nunito flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold transition-all duration-300 ${
                      isHealthy
                        ? "bg-white text-brand-900 hover:bg-neutral-100"
                        : "bg-black text-white hover:bg-neutral-800"
                    }`}
                  >
                    Subscribe
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
