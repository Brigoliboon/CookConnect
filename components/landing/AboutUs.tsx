"use client"

import { motion } from "framer-motion"

const stats = [
  { label: "Meals Delivered", value: "50K+" },
  { label: "Happy Customers", value: "2K+" },
  { label: "Chef Partners", value: "24" },
  { label: "Cities", value: "12" },
]

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.12 },
  }),
}

export function AboutUs() {
  return (
    <motion.section
      id="about"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="bg-white px-6 py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-20 lg:grid-cols-5">
          <motion.div variants={fadeUp} custom={0} className="lg:col-span-3">
            <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
              About Us
            </span>
            <h2 className="font-playfair mt-4 text-5xl font-medium leading-tight text-black sm:text-6xl lg:text-7xl">
              Cooking with
              <br />
              Purpose
            </h2>
            <div className="mt-8 h-px w-16 bg-black/20" />
            <p className="font-nunito mt-8 max-w-md text-sm leading-relaxed text-black/50">
              CookConnect was born from a simple idea: good food should be effortless.
              We partner with local chefs to create balanced, delicious meals that fit
              your dietary needs and weekly schedule.
            </p>
            <p className="font-nunito mt-5 max-w-md text-sm leading-relaxed text-black/50">
              Every ingredient is sourced fresh, every recipe is tested in-house, and
              every delivery is tracked so you know exactly when your food arrives.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-5 lg:col-span-2">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                custom={i + 1}
                className="rounded-2xl border border-neutral-100 bg-neutral-50 p-7 transition-colors hover:border-neutral-200"
              >
                <p className="font-playfair text-4xl font-medium text-black">{s.value}</p>
                <p className="font-nunito mt-1.5 text-xs text-black/40">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
