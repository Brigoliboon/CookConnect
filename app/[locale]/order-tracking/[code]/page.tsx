"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { formatPrice } from "@/utils/mapbox"
import { TrackingMap, type TrackingMarker } from "@/components/ui/TrackingMap"
import { Package, Check } from "lucide-react"

const STEPS = ["inquiry", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered"] as const

interface TrackedOrder {
  short_code: string
  status: string
  items: { name: string; qty: number }[]
  subtotal_cents: number
  shipping_cents: number
  vat_cents: number
  currency: string
  created_at: string
  destination: { lat: number; lng: number } | null
  rider: { lat: number; lng: number; updated_at: string | null } | null
}

export default function OrderTrackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: shortCode } = use(params)
  const t = useTranslations("tracking")
  const [code, setCode] = useState("")
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState("")

  async function verify(silent = false) {
    if (code.trim().length < 6) return
    if (!silent) {
      setChecking(true)
      setError("")
    }
    try {
      const res = await fetch("/api/order-tracking/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short_code: shortCode, pickup_code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (silent) return
        if (res.status === 429) setError(t("locked"))
        else if (res.status === 404) setError(t("notFound"))
        else if (data.error === "NOT_READY") setError(t("notReady"))
        else setError(t("wrongCode"))
        return
      }
      setOrder(data as TrackedOrder)
    } catch {
      if (!silent) setError(t("wrongCode"))
    } finally {
      if (!silent) setChecking(false)
    }
  }

  useEffect(() => {
    if (!order) return
    const id = setInterval(() => verify(true), 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order !== null, code])

  const markers: TrackingMarker[] = [
    ...(order?.destination
      ? [{ id: "dest", lat: order.destination.lat, lng: order.destination.lng, label: t("destination"), type: "orders" as const }]
      : []),
    ...(order?.rider
      ? [{ id: "rider", lat: order.rider.lat, lng: order.rider.lng, label: t("rider"), type: "rider" as const }]
      : []),
  ]

  function riderAgo() {
    if (!order?.rider?.updated_at) return t("justNow")
    const mins = Math.max(0, Math.round((Date.now() - new Date(order.rider.updated_at).getTime()) / 60000))
    return mins < 1 ? t("justNow") : t("minAgo", { n: mins })
  }

  const stepIndex = order ? STEPS.indexOf(order.status as (typeof STEPS)[number]) : -1

  if (!order) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-16">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <Package size={24} />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
          {t("title")} · {shortCode.toUpperCase()}
        </h1>
        <div className="mt-8 w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">{t("subtitle")}</p>
          <label className="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {t("codeLabel")}
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder={t("codePlaceholder")}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-center text-xl font-bold tracking-[0.3em] text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
          />
          {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
          <button
            onClick={() => verify()}
            disabled={code.trim().length < 6 || checking}
            className="mt-4 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checking ? t("tracking") : t("track")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <TrackingMap markers={markers} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 max-h-[55%] overflow-y-auto p-4">
        <div className="pointer-events-auto mx-auto w-full max-w-md space-y-3">
          <div className="rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold capitalize text-neutral-900">
                {order.status.replaceAll("_", " ")}
              </p>
              {order.rider && (
                <p className="text-xs text-neutral-500">{t("lastSeen", { ago: riderAgo() })}</p>
              )}
            </div>
            {order.status !== "cancelled" && (
              <div className="mt-3 flex items-center">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex flex-1 items-center last:flex-none">
                    <span
                      title={s.replaceAll("_", " ")}
                      className={`flex size-5 items-center justify-center rounded-full ${
                        i <= stepIndex ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-400"
                      }`}
                    >
                      {i <= stepIndex && <Check size={10} />}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className={`h-0.5 flex-1 ${i < stepIndex ? "bg-neutral-900" : "bg-neutral-200"}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{t("items")}</p>
            <div className="mt-2 space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">
                    {item.name} <span className="text-xs text-neutral-400">x{item.qty}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 text-sm font-bold text-neutral-900">
              <span>{t("total")}</span>
              <span>{formatPrice(order.subtotal_cents + order.shipping_cents)}</span>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              {t("orderedOn")} {(order.created_at ?? "").split("T")[0]}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
