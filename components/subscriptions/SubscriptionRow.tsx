"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Ban, CalendarClock, ChevronRight, Ellipsis, Pause, Play, RefreshCcw } from "lucide-react"
import {
  avatarTone,
  displayName,
  entitlementLabel,
  initials,
  isRenewalDueSoon,
  lifecycleOf,
  planLabel,
  type Lifecycle,
  type SubscriptionListItem,
} from "./helpers"

const STATUS_LABEL: Record<Lifecycle, string> = {
  active: "Active",
  paused: "Paused",
  depleted: "Depleted",
  cancelled: "Cancelled",
}

interface SubscriptionRowProps {
  sub: SubscriptionListItem
  onOpen: (sub: SubscriptionListItem) => void
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
}

export function SubscriptionRow({ sub, onOpen, onPause, onResume, onCancel }: SubscriptionRowProps) {
  const name = displayName(sub)
  const life = lifecycleOf(sub)
  const entitlement = entitlementLabel(sub)
  const dueSoon = isRenewalDueSoon(sub)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpen])

  return (
    <div
      className={`flex items-center gap-3 border-t border-[#F1F5F9] py-3 first:border-t-0 md:min-h-[72px] ${
        life === "cancelled" ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(sub)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
      >
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone(sub.id)}`}
        >
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold tracking-tight text-[#0F172A]">{name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#475569]">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <RefreshCcw size={14} strokeWidth={1.75} className="shrink-0" />
              <span className="truncate">
                {planLabel(sub)}
                {entitlement ? ` · ${entitlement}` : ""}
              </span>
            </span>
            {life !== "active" && (
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                {STATUS_LABEL[life]}
              </span>
            )}
          </span>
          {dueSoon && (
            <span className="mt-1 inline-flex h-6 items-center gap-1 rounded-full bg-[#FEF3C7] px-2 text-xs font-semibold text-[#92400E]">
              <CalendarClock size={14} strokeWidth={1.75} />
              Renewal due soon
            </span>
          )}
        </span>
        <ChevronRight size={20} className="shrink-0 text-[#94A3B8]" />
      </button>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label={`More actions for ${name}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-12 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
        >
          <Ellipsis size={20} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
            <MenuItem
              onClick={() => {
                setMenuOpen(false)
                onOpen(sub)
              }}
            >
              View details
            </MenuItem>
            {sub.status === "active" && !sub.paused_at && onPause && (
              <MenuItem
                onClick={() => {
                  setMenuOpen(false)
                  onPause(sub.id)
                }}
              >
                <Pause size={16} className="text-[#475569]" />
                Pause
              </MenuItem>
            )}
            {sub.status === "active" && sub.paused_at && onResume && (
              <MenuItem
                onClick={() => {
                  setMenuOpen(false)
                  onResume(sub.id)
                }}
              >
                <Play size={16} className="text-[#475569]" />
                Resume
              </MenuItem>
            )}
            {sub.status === "active" && onCancel && (
              <MenuItem
                danger
                onClick={() => {
                  setMenuOpen(false)
                  onCancel(sub.id)
                }}
              >
                <Ban size={16} />
                Cancel
              </MenuItem>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium hover:bg-[#F8FAFC] ${
        danger ? "text-[#9F1239]" : "text-[#1E293B]"
      }`}
    >
      {children}
    </button>
  )
}
