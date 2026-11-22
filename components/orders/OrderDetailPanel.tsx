"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import {
  Check,
  Clock,
  ImageOff,
  MapPin,
  Package,
  Phone,
  Receipt,
  StickyNote,
  Truck,
  X,
} from "lucide-react"
import { formatPrice } from "@/utils/mapbox"
import {
  avatarClass,
  exclusiveSubtotal,
  formatOrderWhen,
  initials,
  isPickupOrder,
  mapsUrl,
  nextStep,
  orderNote,
  orderTotal,
  shortOrderId,
  type BoardOrder,
} from "./model"
import type { OrderStatus } from "@/lib/supabase/models"

interface OrderDetailPanelProps {
  order: BoardOrder
  updating?: boolean
  onClose: () => void
  onUpdateStatus: (id: string, status: OrderStatus) => void
}

export function OrderDetailPanel({ order, updating, onClose, onUpdateStatus }: OrderDetailPanelProps) {
  const pickup = isPickupOrder(order)
  const step = nextStep(order.status, pickup)
  const map = mapsUrl(order)
  const note = orderNote(order)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const body = (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close order details"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,23,42,0.28)] md:left-24 max-md:bottom-[5.5rem]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="absolute inset-y-0 right-0 hidden w-[420px] flex-col rounded-l-2xl bg-white shadow-[-8px_0_32px_rgba(15,23,42,0.12)] md:flex"
      >
        <PanelContent
          order={order}
          pickup={pickup}
          step={step}
          map={map}
          note={note}
          updating={updating}
          onClose={onClose}
          onUpdateStatus={onUpdateStatus}
        />
      </aside>

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title-phone"
        className="absolute inset-x-0 bottom-[5.5rem] flex max-h-[min(650px,calc(100dvh-6.5rem))] flex-col rounded-t-[20px] bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.16)] md:hidden"
      >
        <div className="mx-auto mt-2.5 h-1 w-12 shrink-0 rounded-full bg-[#CBD5E1]" />
        <PanelContent
          order={order}
          pickup={pickup}
          step={step}
          map={map}
          note={note}
          updating={updating}
          onClose={onClose}
          onUpdateStatus={onUpdateStatus}
          phone
        />
      </aside>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(body, document.body)
}

function PanelContent({
  order,
  pickup,
  step,
  map,
  note,
  updating,
  onClose,
  onUpdateStatus,
  phone,
}: {
  order: BoardOrder
  pickup: boolean
  step: { status: OrderStatus; panelLabel: string } | null
  map: string | null
  note: string | null
  updating?: boolean
  onClose: () => void
  onUpdateStatus: (id: string, status: OrderStatus) => void
  phone?: boolean
}) {
  const titleId = phone ? "order-detail-title-phone" : "order-detail-title"
  return (
    <>
      <header className={`flex items-start justify-between gap-3 border-b border-[#F1F5F9] ${phone ? "px-4 py-2" : "px-6 py-4"}`}>
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClass(order.name)}`}
          >
            {initials(order.name) || "?"}
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold tracking-tight text-[#0F172A]">
              {order.name}
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-[#475569]">
              <Receipt size={14} className="text-[#64748B]" />
              Order #{shortOrderId(order.id)}
              <span className="text-[#94A3B8]">·</span>
              <Clock size={14} className="text-[#64748B]" />
              {formatOrderWhen(order.createdAt)}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
        >
          <X size={20} />
        </button>
      </header>

      <div className={`min-h-0 flex-1 overflow-y-auto ${phone ? "px-4 py-1" : "px-6 py-2"}`}>
        <section className="border-b border-[#F1F5F9] py-2.5">
          <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-[#334155] uppercase">
            <Phone size={16} /> Contact
          </h3>
          {order.mobileNumber ? (
            <a
              href={`tel:${order.mobileNumber}`}
              className="flex min-h-14 items-center gap-3 rounded-xl text-inherit"
            >
              <Phone size={18} className="text-[#475569]" />
              <span>
                <span className="block font-medium text-[#0F172A]">{order.mobileNumber}</span>
                <span className="text-sm text-[#475569]">Tap to call</span>
              </span>
            </a>
          ) : (
            <p className="py-3 text-sm text-[#475569]">No phone number</p>
          )}
        </section>

        <section className="border-b border-[#F1F5F9] py-2.5">
          <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-[#334155] uppercase">
            <Truck size={16} /> {pickup ? "Pickup" : "Delivery"}
          </h3>
          <div className="flex min-h-14 items-center gap-3">
            <MapPin size={18} className="shrink-0 text-[#475569]" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[#0F172A]">{pickup ? "Pickup" : "Delivery"}</div>
              {!pickup && order.address ? (
                <div className="text-sm text-[#475569]">{order.address}</div>
              ) : null}
            </div>
            {map && (
              <a
                href={map}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm font-semibold text-[#166534] hover:underline"
              >
                Open map
              </a>
            )}
          </div>
        </section>

        <section className="border-b border-[#F1F5F9] py-2.5">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-[#334155] uppercase">
            <Package size={16} /> Items
          </h3>
          <ul className="flex flex-col gap-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-1">
                <ItemThumb path={item.image_path} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-[#0F172A]">{item.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-[#0F172A]">
                      {formatPrice(Number(item.unit_price_cents) * item.qty)}
                    </span>
                  </div>
                  <div className="text-sm text-[#475569]">× {item.qty}</div>
                  {(item.addons ?? []).map((addon) => (
                    <p key={addon.id} className="text-sm text-[#475569]">
                      + {addon.name}
                      {Number(addon.extra_cents) > 0 ? ` (+${formatPrice(Number(addon.extra_cents))})` : " (Free)"}
                    </p>
                  ))}
                  {item.note ? <p className="text-sm text-[#92400E]">{item.note}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-b border-[#F1F5F9] py-2.5">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-[#334155] uppercase">
            <Receipt size={16} /> Summary
          </h3>
          <div className="flex flex-col gap-2 text-sm text-[#1E293B]">
            <Row label="Subtotal" value={formatPrice(exclusiveSubtotal(order))} />
            {order.shippingCents > 0 && <Row label="Shipping" value={formatPrice(order.shippingCents)} />}
            <Row label="VAT 5% incl." value={formatPrice(order.vatCents)} />
            <div className="mt-1 flex items-center justify-between text-base font-semibold text-[#0F172A]">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(orderTotal(order))}</span>
            </div>
          </div>
        </section>

        <section className="py-2.5">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-[#334155] uppercase">
            <StickyNote size={16} /> Note
          </h3>
          <p className="text-sm text-[#475569]">{note ?? "No note added"}</p>
        </section>
      </div>

      <footer className={`shrink-0 border-t border-[#F1F5F9] bg-white ${phone ? "px-4 py-2 pb-3" : "px-6 py-3"}`}>
        {step && (
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus(order.id, step.status)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#15803D] text-base font-semibold text-white transition-colors hover:bg-[#166534] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
          >
            <Check size={18} />
            {step.panelLabel}
          </button>
        )}
        {order.status !== "cancelled" && order.status !== "delivered" && (
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus(order.id, "cancelled")}
            className="mt-1 flex h-12 w-full items-center justify-center rounded-xl text-base font-medium text-[#9F1239] transition-colors hover:bg-[#FFF1F2] disabled:opacity-50"
          >
            Cancel order
          </button>
        )}
      </footer>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#475569]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function ItemThumb({ path }: { path: string | null }) {
  const src = path && (path.startsWith("http") || path.startsWith("/")) ? path : null
  return (
    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F1F5F9] text-[#475569]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-0.5 text-[10px] leading-tight">
          <ImageOff size={16} />
          No photo
        </span>
      )}
    </span>
  )
}
