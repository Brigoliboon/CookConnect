"use client"

import { useEffect, useRef, useState } from "react"
import { Printer, Loader2, CircleCheck, TriangleAlert } from "lucide-react"
import {
  connectPrinter,
  writePrinter,
  isBluetoothSupported,
  buildOrderReceipt,
} from "@/lib/thermal"
import type { ReceiptOrder, ReceiptOptions, ThermalPrinterConfig } from "@/lib/thermal"

type PrintStatus = "idle" | "connecting" | "printing" | "success" | "error"

interface OrderPrintButtonProps {
  order: ReceiptOrder
  /** Bluetooth device name prefix filter shown in the pairing dialog. */
  printerNamePrefix?: string
  /** Optional printer GATT UUID overrides for non-standard devices. */
  printerConfig?: Omit<ThermalPrinterConfig, "namePrefix">
  /** Receipt header customization. */
  receiptOptions?: ReceiptOptions
  className?: string
}

const statusLabel: Record<PrintStatus, string> = {
  idle: "Print",
  connecting: "Connecting...",
  printing: "Printing...",
  success: "Printed",
  error: "Try again",
}

export function OrderPrintButton({
  order,
  printerNamePrefix,
  printerConfig,
  receiptOptions,
  className = "",
}: OrderPrintButtonProps) {
  const [status, setStatus] = useState<PrintStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  function resetSoon() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setStatus("idle")
      setError(null)
    }, 3000)
  }

  async function handlePrint() {
    if (status === "connecting" || status === "printing") return

    if (!isBluetoothSupported()) {
      setStatus("error")
      setError("Bluetooth not supported. Use Chrome/Edge on a Bluetooth-capable device.")
      resetSoon()
      return
    }

    try {
      setError(null)
      setStatus("connecting")
      await connectPrinter({ namePrefix: printerNamePrefix, ...printerConfig })
      setStatus("printing")
      const bytes = buildOrderReceipt(order, receiptOptions)
      await writePrinter(bytes, { namePrefix: printerNamePrefix, ...printerConfig })
      setStatus("success")
      resetSoon()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to print."
      setStatus("error")
      setError(message)
      resetSoon()
    }
  }

  const isBusy = status === "connecting" || status === "printing"

  return (
    <div className={`flex flex-col ${className}`}>
      <button
        type="button"
        onClick={handlePrint}
        disabled={isBusy}
        aria-label={`Print receipt for ${order.name}`}
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          status === "success"
            ? "border-brand-400 bg-brand-900 text-white"
            : status === "error"
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-brand-900 bg-white text-brand-900 hover:bg-brand-900 hover:text-white"
        }`}
      >
        {isBusy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : status === "success" ? (
          <CircleCheck size={14} />
        ) : status === "error" ? (
          <TriangleAlert size={14} />
        ) : (
          <Printer size={14} />
        )}
        {statusLabel[status]}
      </button>
      {status === "error" && error && (
        <p className="mt-1 text-[11px] leading-snug text-red-600">{error}</p>
      )}
    </div>
  )
}
