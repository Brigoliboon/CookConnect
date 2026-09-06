"use client"

import { use, useState } from "react"
import { useTranslations } from "next-intl"
import { formatPrice } from "@/utils/mapbox"
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
}

export default function OrderTrackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: shortCode } = use(params)
  const t = useTranslations("tracking")
  const [code, setCode] = useState("")
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState("")

  async function verify() {
    if (code.trim().length < 6) return
    setChecking(true)
    setError("")
    try {
      const res = await fetch("/api/order-tracking/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short_code: shortCode, pickup_code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) setError(t("locked"))
        else if (res.status === 404) setError(t("notFound"))
        else if (data.error === "NOT_READY") setError(t("notReady"))
        else setError(t("wrongCode"))
        return
      }
      setOrder(data as TrackedOrder)
    } catch {
      setError(t("wrongCode"))
    } finally {
      setChecking(false)
    }
  }

  const stepIndex = order ? STEPS.indexOf(order.status as (typeof STEPS)[number]) : -1

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-16">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-900 text-white">
        <Package size={24} />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
        {t("title")} · {shortCode.toUpperCase()}
      </h1>

      {!order ? (
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
            onClick={verify}
            disabled={code.trim().length < 6 || checking}
            className="mt-4 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {checking ? t("tracking") : t("track")}
          </button>
        </div>
      ) : (
        <div className="mt-8 w-full space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            {order.status === "cancelled" ? (
              <p className="text-center text-sm font-semibold text-red-600">cancelled</p>
            ) : (
              <ol className="space-y-0">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full ${
                          i <= stepIndex ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {i <= stepIndex && <Check size={12} />}
                      </span>
                      {i < STEPS.length - 1 && (
                        <span className={`h-5 w-px ${i < stepIndex ? "bg-neutral-900" : "bg-neutral-200"}`} />
                      )}
                    </div>
                    <p
                      className={`pb-4 text-sm capitalize ${
                        i <= stepIndex ? "font-semibold text-neutral-900" : "text-neutral-400"
                      }`}
                    >
                      {s.replaceAll("_", " ")}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
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
              <span>{formatPrice(order.subtotal_cents + order.shipping_cents + (order.vat_cents ?? 0))}</span>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              {t("orderedOn")} {(order.created_at ?? "").split("T")[0]}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
