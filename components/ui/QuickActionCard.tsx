"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

interface QuickActionCardProps {
  label: string
  href: string
  icon: LucideIcon
  from: string
  to: string
}

export function QuickActionCard({ label, href, icon: Icon, from, to }: QuickActionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="rounded-xl"
    >
      <Link
        href={href}
        className="flex flex-col items-center gap-2 rounded-xl px-5 py-6 text-sm font-semibold text-white transition-shadow hover:shadow-lg"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <Icon size={24} />
        {label}
      </Link>
    </motion.div>
  )
}
