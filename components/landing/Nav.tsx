"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "@/hooks/useTheme"
import { Sun, Moon, Menu, X } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { CartButton } from "@/components/landing/CartButton"
import { CartDialog } from "@/components/landing/CartDialog"

function LangSwitch({ compact = false }: { compact?: boolean }) {
  const lang = useTranslations("lang")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const currentIndex = locale === "en" ? 0 : 1
  return (
    <div
      role="group"
      aria-label={lang("label")}
      className={`flex items-center gap-1 ${compact ? "" : "max-sm:hidden"}`}
    >
      <span className="font-nunito text-xs font-semibold text-white/60 max-sm:hidden">{lang("label")}</span>
      <div dir="ltr" className="relative overflow-hidden rounded-full border border-white/15 bg-white/10 backdrop-blur-sm">
        <motion.div
          aria-hidden
          animate={{ x: currentIndex * 100 + "%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-white shadow-sm"
        />
        {(["EN", "AR"] as const).map((code, i) => (
          <button
            key={code}
            onClick={() => {
              const target = i === 0 ? "en" : "ar"
              if (target !== locale) {
                router.replace(pathname, { locale: target, scroll: false })
              }
            }}
            aria-pressed={currentIndex === i}
            className={`relative z-10 py-1 text-center text-[11px] font-bold tracking-wider transition-colors ${compact ? "w-9" : "w-11"}`}
          >
            <span className={currentIndex === i ? "text-black" : "text-white/60"}>{code}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function Nav() {
  const t = useTranslations("nav")
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
    { href: "#meals", label: t("menu") },
    { href: "#subscription", label: t("pricing") },
    { href: "#about", label: t("about") },
    { href: "#contact", label: t("contact") },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-3 transition-all duration-300 ${
          scrolled ? "bg-black/70 backdrop-blur-md" : ""
        }`}
      >
      <Link href="/" className="font-playfair text-xl font-bold tracking-tight text-white">
        CookConnect
      </Link>

      <div className="hidden items-center gap-4 sm:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="font-nunito text-sm text-white/60 transition-colors hover:text-white">
            {l.label}
          </Link>
        ))}
        <CartButton onOpen={() => setCartOpen(true)} />
        <LangSwitch />
        <button
          onClick={toggle}
          className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
          aria-label={t("toggleTheme")}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <Link
          href="/login"
          className="font-nunito rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-white/90"
        >
          {t("signIn")}
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <LangSwitch compact />
        <CartButton mobile onOpen={() => setCartOpen(true)} />
        <button
          onClick={() => setOpen(!open)}
          className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
          aria-label={t("toggleMenu")}
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
            className="absolute inset-x-0 top-full overflow-hidden bg-black/90 backdrop-blur-md"
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
                <LangSwitch compact />
                <button
                  onClick={toggle}
                  className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
                  aria-label={t("toggleTheme")}
                >
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="font-nunito ml-auto rounded-xl bg-white px-4 py-1.5 text-xs font-semibold text-black transition-all hover:bg-white/90"
                >
                  {t("signIn")}
                </Link>
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