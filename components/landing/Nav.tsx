"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "@/hooks/useTheme"
import { Sun, Moon, Menu, X } from "lucide-react"
import { CartButton } from "@/components/landing/CartButton"
import { CartDialog } from "@/components/landing/CartDialog"

export function Nav() {
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const links = [
    { href: "#meals", label: "Menu" },
    { href: "#subscription", label: "Pricing" },
    { href: "#about", label: "About" },
    { href: "#contact", label: "Contact" },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 transition-all duration-300 ${
          scrolled ? "bg-black/70 backdrop-blur-md" : ""
        }`}
      >
      <Link href="/" className="font-playfair text-xl font-bold tracking-tight text-white">
        CookConnect
      </Link>

      <div className="hidden sm:flex items-center gap-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="font-nunito text-sm text-white/60 transition-colors hover:text-white">
            {l.label}
          </Link>
        ))}
        <CartButton onOpen={() => setCartOpen(true)} />
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

      <div className="flex sm:hidden items-center gap-2">
        <CartButton mobile onOpen={() => setCartOpen(true)} />
        <Link
          href="/login"
          className="font-nunito rounded-xl bg-white px-4 py-1.5 text-xs font-semibold text-black transition-all hover:bg-white/90"
        >
          Sign In
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full overflow-hidden bg-black/90 backdrop-blur-md"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-nunito rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-3 px-3 py-2">
                <button
                  onClick={toggle}
                  className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.nav>

      <CartDialog open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
