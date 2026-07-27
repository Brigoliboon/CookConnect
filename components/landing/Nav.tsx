"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useTheme } from "@/hooks/useTheme"
import { Sun, Moon, ShoppingCart } from "lucide-react"

export function Nav() {
  const { theme, toggle } = useTheme()

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
    >
      <Link href="/" className="font-playfair text-xl font-bold tracking-tight text-white">
        CookConnect
      </Link>
      <div className="flex items-center gap-4">
        <Link href="#meals" className="font-nunito text-sm text-white/60 transition-colors hover:text-white">
          Menu
        </Link>
        <Link href="#subscription" className="font-nunito text-sm text-white/60 transition-colors hover:text-white">
          Pricing
        </Link>
        <Link href="#about" className="font-nunito text-sm text-white/60 transition-colors hover:text-white">
          About
        </Link>
        <Link href="#contact" className="font-nunito text-sm text-white/60 transition-colors hover:text-white">
          Contact
        </Link>
        <button
          className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
          aria-label="Open cart"
        >
          <ShoppingCart size={17} />
        </button>
        <button
          onClick={toggle}
          className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <Link
          href="/login"
          className="font-nunito rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-white/90"
        >
          Sign In
        </Link>
      </div>
    </motion.nav>
  )
}
