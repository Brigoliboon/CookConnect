"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/AuthProvider"
import { NAV_ITEMS } from "@/constants"
import { Button } from "@/components/ui"
import { Menu, X, LayoutDashboard, Users, ClipboardList, Truck, UserPlus, MapPin, UserCircle } from "lucide-react"

const iconMap: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
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
  const [open, setOpen] = useState(false)

  if (!user) return null

  const navItems = NAV_ITEMS[user.role]

  return (
    <nav className="bg-brand-900 px-6 py-3 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={`/${user.role}`} className="text-lg font-bold tracking-tight">
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
          <Button variant="ghost" size="sm" className="text-white/80 hover:text-white" onClick={signOut}>
            Sign Out
          </Button>
          <button className="sm:hidden text-white transition-transform hover:scale-110" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1 border-t border-white/20 pt-3">
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
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50">
                <UserCircle size={16} />
                {user.name}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
