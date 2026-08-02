"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/AuthProvider"
import { NAV_ITEMS } from "@/constants"
import { Button } from "@/components/ui"
import { Menu, X, LayoutDashboard, Users, ClipboardList, Truck, UserPlus, MapPin, UserCircle, Utensils, Receipt } from "lucide-react"

const iconMap: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  Meals: Utensils,
  Orders: Receipt,
  Customers: Users,
  Subscriptions: ClipboardList,
  Deliveries: Truck,
  Accounts: UserPlus,
  Home: LayoutDashboard,
  Location: MapPin,
  Profile: UserCircle,
}

export function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!user) return null

  const navItems = NAV_ITEMS[user.role]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 transition-all duration-300 ${
      scrolled ? "bg-brand-900/90 backdrop-blur-md" : "bg-brand-900"
    }`}>
      <div className="flex items-center gap-8">
        <Link href={`/${user.role}`} className="text-lg font-bold tracking-tight text-white">
          CookConnect
        </Link>
        <div className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.label]
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                {Icon && <Icon size={16} />}
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline text-sm text-white/60">{user.name}</span>
        <Button variant="ghost" size="sm" className="text-white/80 hover:text-white" onClick={async () => { await signOut(); router.push("/login") }}>
          Sign Out
        </Button>
        <button className="sm:hidden text-white transition-transform hover:scale-110" onClick={() => setOpen(!open)}>
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
            className="absolute left-0 right-0 top-full overflow-hidden bg-brand-900/95 backdrop-blur-md"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {navItems.map((item) => {
                const Icon = iconMap[item.label]
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    {Icon && <Icon size={16} />}
                    {item.label}
                  </Link>
                )
              })}
              <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50">
                <UserCircle size={16} />
                {user.name}
              </div>
              <button
                onClick={async () => { await signOut(); router.push("/login") }}
                className="mt-1 rounded-lg px-3 py-2 text-left text-sm text-white/50 transition-colors hover:text-white"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
