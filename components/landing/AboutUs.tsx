"use client"

import { motion } from "framer-motion"

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
      <div>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div variants={fadeUp} custom={0} className="overflow-hidden rounded-2xl">
            <img
              src="/landingpage/cook-connect-team.jpg"
              alt="CookConnect team"
              className="h-full w-full scale-125 object-cover"
            />
          </motion.div>
          <motion.div variants={fadeUp} custom={1}>
            <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
              About Us
            </span>
            <h2 className="font-playfair mt-4 text-5xl font-medium leading-tight text-black sm:text-6xl lg:text-7xl">
              Cooking with
              <br />
              Purpose
            </h2>
            <div className="mt-8 h-px w-16 bg-black/20" />
            <p className="font-nunito mt-8 text-base leading-relaxed text-black/70">
              We started the healthy food concept in <strong>September 2016</strong> after realizing that food to us isn&apos;t just food. To us, it is a pathway to <strong>better energy levels, sharper mental clarity, improved mood, better health, and overall wellbeing</strong>. We saw that when you connect the dots between eating well and feeling refreshed, that&apos;s when good things happen. Our ingredients work their magic on your health and wellbeing, and that&apos;s what drives everything we do.
            </p>
            <p className="font-nunito mt-5 text-base leading-relaxed text-black/70">
              We are on a <strong>mission to help people see, understand, and consume food in a totally new way</strong>. We want people to eat our food and feel amazing afterwards, and we want them to be surprised by just how delicious healthy food can be. More than that, we hope our food inspires people to eat healthier for good, to make better choices, and to be conscious of where their food comes from. It&apos;s about <strong>creating a lasting shift in how people think about nourishment</strong>.
            </p>
            <p className="font-nunito mt-5 text-base leading-relaxed text-black/70">
              <strong>Everything we serve is made by us</strong>. We know exactly where all our ingredients come from and we know how to cook them to get the most out of them, both in terms of flavour and nutrients. This commitment ensures that every meal is <strong>crafted with intention, delivering an exceptional and nourishing experience</strong> that leaves you feeling your best.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}
