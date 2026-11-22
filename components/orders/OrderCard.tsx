"use client"

import { useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronRight,
  Ellipsis,
  MapPin,
  Package,
  Phone,
  Store,
  Truck,
  Wallet,
} from "lucide-react"
import { formatPrice } from "@/utils/mapbox"
import { OrderPrintButton } from "@/components/ui/OrderPrintButton"
import {
  avatarClass,
  initials,
  isPickupOrder,
  itemCount,
  nextStep,
  orderTotal,
  CHANGEABLE_STATUSES,
  type BoardOrder,
} from "./model"
import type { OrderStatus } from "@/lib/supabase/models"

interface OrderCardProps {
  order: BoardOrder
  selected?: boolean
  updating?: boolean
  onOpen: (id: string) => void
  onUpdateStatus: (id: string, status: OrderStatus) => void
}

export function OrderCard({ order, selected, updating, onOpen, onUpdateStatus }: OrderCardProps) {
  const pickup = isPickupOrder(order)
  const step = nextStep(order.status, pickup)
  const count = itemCount(order.items)
  const [menuOpen, setMenuOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  function closeMenu() {
    setMenuOpen(false)
    setStatusOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu()
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpen])

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] transition-shadow ${
        selected
          ? "border-transparent shadow-[0_0_0_2px_#166534,0_8px_24px_rgba(15,23,42,0.12)]"
          : "border-[#E2E8F0]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-wide ${avatarClass(order.name)}`}
          >
            {initials(order.name) || "?"}
          </span>
          <h3 className="truncate text-base font-semibold tracking-tight text-[#0F172A]">{order.name}</h3>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label="Order actions"
            aria-expanded={menuOpen}
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
            className="flex size-12 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
          >
            <Ellipsis size={20} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
              <MenuItem
                onClick={() => {
                  closeMenu()
                  onOpen(order.id)
                }}
              >
                View details
              </MenuItem>
              <div className="px-2 py-1">
                <OrderPrintButton
                  order={order}
                  receiptOptions={{ storeName: "CookConnect" }}
                  className="!rounded-xl !border-0 !bg-transparent !py-2.5 !text-sm !font-medium !text-[#1E293B] hover:!bg-[#F8FAFC] hover:!text-[#1E293B]"
                />
              </div>
              <MenuItem onClick={() => setStatusOpen((open) => !open)}>
                Change status
                <ChevronRight size={16} className="ml-auto text-[#64748B]" />
              </MenuItem>
              {statusOpen && (
                <div className="border-t border-[#F1F5F9] py-1">
                  {CHANGEABLE_STATUSES.filter((entry) => entry.status !== order.status).map((entry) => (
                    <MenuItem
                      key={entry.status}
                      onClick={() => {
                        closeMenu()
                        onUpdateStatus(order.id, entry.status)
                      }}
                    >
                      {entry.label}
                    </MenuItem>
                  ))}
                </div>
              )}
              {order.status !== "cancelled" && order.status !== "delivered" && (
                <MenuItem
                  danger
                  onClick={() => {
                    closeMenu()
                    onUpdateStatus(order.id, "cancelled")
                  }}
                >
                  Cancel order
                </MenuItem>
              )}
            </div>
          )}
        </div>
      </div>

      <ul className="mt-4 flex flex-col">
        {order.mobileNumber ? (
          <MetaRow icon={<Phone size={18} />}>{order.mobileNumber}</MetaRow>
        ) : null}
        {pickup ? (
          <MetaRow icon={<Store size={18} />}>Pickup</MetaRow>
        ) : (
          <>
            <MetaRow icon={<MapPin size={18} />}>{order.address}</MetaRow>
            <MetaRow icon={<Truck size={18} />}>Delivery</MetaRow>
          </>
        )}
      </ul>

      <div className="mt-auto border-t border-[#F1F5F9] pt-5">
        <div className="mb-4 flex min-h-11 items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-base font-medium text-[#1E293B]">
            <Package size={18} className="text-[#64748B]" />
            {count} {count === 1 ? "item" : "items"}
          </span>
          <span className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#0F172A] tabular-nums">
            <Wallet size={18} className="text-[#64748B]" />
            {formatPrice(orderTotal(order))}
          </span>
        </div>
        {step && (
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus(order.id, step.status)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#DCFCE7] text-base font-semibold text-[#14532D] transition-colors hover:bg-[#BBF7D0] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
          >
            <Check size={18} />
            {step.cardLabel}
          </button>
        )}
      </div>
    </article>
  )
}

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex min-h-11 items-center gap-2.5 text-base leading-snug text-[#1E293B]">
      <span className="shrink-0 text-[#64748B]">{icon}</span>
      <span className="min-w-0 line-clamp-2">{children}</span>
    </li>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center px-3 text-left text-sm font-medium transition-colors hover:bg-[#F8FAFC] ${
        danger ? "text-[#9F1239]" : "text-[#1E293B]"
      }`}
    >
      {children}
    </button>
  )
}

