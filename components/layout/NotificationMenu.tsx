"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  Inbox,
  Mail,
  MailX,
  Receipt,
  Truck,
} from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import { enablePush, disablePush } from "@/lib/notifications/client"
import { formatBadgeCount } from "@/constants/navigation"
import type { AppNotification } from "@/lib/supabase/models"

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

const triggerClassName =
  "relative flex size-12 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E293B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"

export function NotificationMenu() {
  const router = useRouter()
  const [pushOn, setPushOn] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [emailOn, setEmailOn] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(true)

  useEffect(() => {
    navigator.serviceWorker?.getRegistration("/sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription()
      setPushOn(!!sub)
    }).catch(() => {})
    fetch("/api/notifications/email")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEmailOn(Boolean(d?.enabled)))
      .catch(() => {})
  }, [])

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

  const toggleEmail = async () => {
    setEmailLoading(true)
    try {
      const res = await fetch("/api/notifications/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !emailOn }),
      })
      if (res.ok) setEmailOn(Boolean((await res.json()).enabled))
    } finally {
      setEmailLoading(false)
    }
  }

  const openNotification = (notification: AppNotification) => {
    setNotifOpen(false)
    if (!notification.read_at) void markRead([notification.id])
    const url = notification.data?.url
    if (typeof url === "string" && url) router.push(url)
  }

  const badge = formatBadgeCount(unreadCount)

  return (
    <div ref={notifRef} className="relative">
      <button
        type="button"
        onClick={() => setNotifOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={notifOpen}
        className={triggerClassName}
      >
        <Bell size={20} />
        {badge && (
          <span className="absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#B91C1C] px-[5px] text-[12px] font-semibold leading-[18px] text-white tabular-nums">
            {badge}
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
                  type="button"
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
                          type="button"
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
                type="button"
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

            <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-4 py-3">
              <div className="flex items-center gap-2">
                {emailOn ? <Mail size={14} className="text-brand-900" /> : <MailX size={14} className="text-neutral-500" />}
                <div>
                  <p className="text-xs font-semibold text-neutral-800">Email notifications</p>
                  <p className="text-[10px] text-neutral-500">
                    {emailOn ? "New orders and subscription inquiries" : "Disabled"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleEmail}
                disabled={emailLoading}
                role="switch"
                aria-checked={emailOn}
                aria-label="Toggle email notifications"
                className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
                  emailOn ? "bg-brand-900" : "bg-neutral-300"
                }`}
              >
                <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${
                  emailOn ? "left-[18px]" : "left-0.5"
                }`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
