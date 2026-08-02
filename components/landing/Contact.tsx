"use client"

import { motion } from "framer-motion"
import { MapPin, Phone, Mail, Clock } from "lucide-react"
import Map, { Marker } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

const inputClass =
  "font-nunito w-full border-b border-black/10 bg-transparent px-0 py-3 text-sm text-black outline-none transition-colors placeholder:text-black/20 focus:border-black"

const details = [
  { icon: MapPin, label: "Address", value: "Sheikh Zayed Street, Al Hamidiya 1, Ajman, UAE" },
  { icon: Phone, label: "Phone", value: "+971556634050" },
  { icon: Mail, label: "Email", value: "cookconnectrestaurant@gmail.com" },
  { icon: Clock, label: "Hours", value: "Sat–Thu, 8:00 AM – 10:00 PM" },
]

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export function Contact() {
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
          <div className="grid grid-cols-2 gap-5">
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
          <div className="overflow-hidden rounded-2xl">
            <Map
              mapboxAccessToken={token}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              longitude={55.5220053}
              latitude={25.3969036}
              zoom={16}
              style={{ width: "100%", height: 360 }}
              attributionControl={false}
            >
              <Marker longitude={55.5220053} latitude={25.3969036} anchor="bottom">
                <img src="/icons/marker-skip.png" alt="" className="size-8" />
              </Marker>
            </Map>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:w-[45%]">
          <span className="font-nunito inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-black/30">
            Contact
          </span>
          <h2 className="font-playfair mt-4 text-5xl font-medium leading-tight text-black sm:text-6xl">
            Let&apos;s Talk
          </h2>
          <div className="mt-6 h-px w-12 bg-black/20" />
          <p className="font-nunito mt-6 text-sm leading-relaxed text-black/50">
            We&apos;ll get back to you within 24 hours.
          </p>
          <form className="mt-10 space-y-8">
            <input type="text" placeholder="Your Name" className={inputClass} />
            <input type="email" placeholder="Your Email" className={inputClass} />
            <textarea rows={4} placeholder="Your Message" className={`${inputClass} resize-none`} />
            <button
              type="submit"
              className="font-nunito w-full rounded-xl bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-neutral-800"
            >
              Send Message
            </button>
          </form>
        </motion.div>
      </div>
    </motion.section>
  )
}
