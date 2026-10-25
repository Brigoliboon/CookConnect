"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/AuthProvider"
import { useNotifications } from "@/hooks/useNotifications"
import { useNavCounts } from "@/hooks/useNavCounts"
import { NAV_ITEMS } from "@/constants"
import { Button } from "@/components/ui"
import { Menu, X, LayoutDashboard, Users, ClipboardList, Truck, UserPlus, MapPin, UserCircle, Utensils, Receipt, Bell, BellOff, BellRing, CheckCheck, Inbox, ChefHat } from "lucide-react"
import { enablePush, disablePush } from "@/lib/notifications/client"
import type { AppNotification } from "@/lib/supabase/models"

const iconMap: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  Meals: Utensils,
  Orders: Receipt,
  Customers: Users,
  Chef: ChefHat,
  Subscriptions: ClipboardList,
  Deliveries: Truck,
  Accounts: UserPlus,
  Home: LayoutDashboard,
  Location: MapPin,
  Profile: UserCircle,
}

const HIDDEN_PATHS = [/^\/(ar\/)?rider(\/|$)/]

export const RIDER_NAV_VISIBLE = false

export function isNavbarHidden(pathname: string): boolean {
  if (RIDER_NAV_VISIBLE) return false
  return HIDDEN_PATHS.some((re) => re.test(pathname))
}

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function Navbar({ visible }: { visible?: boolean }) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isVisible = visible ?? !isNavbarHidden(pathname)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.role === "employee")
  const pendingCounts = useNavCounts(user?.role === "employee")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (user?.role !== "employee") return
    navigator.serviceWorker?.getRegistration("/sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription()
      setPushOn(!!sub)
    }).catch(() => {})
  }, [user?.role])

  useEffect(() => {
    if (!notifOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!notifRef.current?.contains(event.target as Node)) setNotifOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotifOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [notifOpen])

  const togglePush = async () => {
    setPushLoading(true)
    try {
      setPushOn(pushOn ? !(await disablePush()) : await enablePush())
    } finally {
      setPushLoading(false)
    }
  }

  const openNotification = (notification: AppNotification) => {
    setNotifOpen(false)
    if (!notification.read_at) void markRead([notification.id])
    const url = notification.data?.url
    if (typeof url === "string" && url) router.push(url)
  }

  if (!user) return null
  if (!isVisible) return null

  const navItems = NAV_ITEMS[user.role]
  const pendingCount = (label: string) => {
    if (label === "Orders") return pendingCounts.orders
    if (label === "Subscriptions") return pendingCounts.subscriptions
    return 0
  }

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
            const pending = pendingCount(item.label)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                {Icon && <Icon size={16} />}
                {item.label}
                {pending > 0 && (
                  <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold leading-none text-white shadow-md shadow-red-950/30 ring-2 ring-brand-900">
                    {pending > 99 ? "99+" : pending}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user.role === "employee" && (
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((value) => !value)}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              aria-expanded={notifOpen}
              className="relative rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold leading-none text-white shadow-md shadow-red-950/30 ring-2 ring-brand-900">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl shadow-black/20"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold">Notifications</p>
                      <p className="text-xs text-neutral-500">
                        {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => void markAllRead()}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-900 transition-colors hover:bg-brand-700/20"
                      >
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                        <Inbox size={28} className="mb-2 text-neutral-300" />
                        <p className="text-sm font-medium text-neutral-500">No notifications yet</p>
                        <p className="mt-0.5 text-xs text-neutral-400">New orders will appear here.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-neutral-100">
                        {notifications.map((notification) => {
                          const Icon = notification.type === "order_inquiry_created" ? Receipt : Truck
                          return (
                            <li key={notification.id}>
                              <button
                                onClick={() => openNotification(notification)}
                                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${
                                  notification.read_at ? "" : "bg-brand-700/10"
                                }`}
                              >
                                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                  notification.read_at ? "bg-neutral-100 text-neutral-500" : "bg-brand-900 text-white"
                                }`}>
                                  <Icon size={15} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-semibold text-neutral-900">{notification.title}</span>
                                    {!notification.read_at && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />}
                                  </span>
                                  <span className="mt-0.5 block line-clamp-2 text-xs text-neutral-500">{notification.body}</span>
                                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-neutral-400">
                                    {timeAgo(notification.created_at)}
                                  </span>
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      {pushOn ? <BellRing size={14} className="text-brand-900" /> : <BellOff size={14} className="text-neutral-500" />}
                      <div>
                        <p className="text-xs font-semibold text-neutral-800">Push notifications</p>
                        <p className="text-[10px] text-neutral-500">
                          {pushOn ? "Enabled on this device" : "Disabled on this device"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={togglePush}
                      disabled={pushLoading}
                      role="switch"
                      aria-checked={pushOn}
                      aria-label="Toggle push notifications"
                      className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
                        pushOn ? "bg-brand-900" : "bg-neutral-300"
                      }`}
                    >
                      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${
                        pushOn ? "left-[18px]" : "left-0.5"
                      }`} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
                const pending = pendingCount(item.label)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    {Icon && <Icon size={16} />}
                    {item.label}
                    {pending > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold leading-none text-white shadow-md shadow-red-950/30 ring-2 ring-brand-900">
                        {pending > 99 ? "99+" : pending}
                      </span>
                    )}
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
