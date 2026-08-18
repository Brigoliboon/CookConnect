"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check, Loader2 } from "lucide-react"

export interface StatusOption {
  value: string
  label: string
  dotClass: string
}

interface OrderStatusDialogProps {
  open: boolean
  customerName: string
  currentStatus: string
  currentBadgeClass: string
  updating: boolean
  options: StatusOption[]
  onSelect: (status: string) => void
  onClose: () => void
}

export function OrderStatusDialog({
  open,
  customerName,
  currentStatus,
  currentBadgeClass,
  updating,
  options,
  onSelect,
  onClose,
}: OrderStatusDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Update Status</h2>
                <p className="mt-0.5 text-sm text-neutral-500">
                  Order for <span className="font-semibold text-neutral-900">{customerName}</span>
                </p>
              </div>
              <button onClick={onClose} className="text-neutral-400 transition-colors hover:text-neutral-700">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-500">Current:</span>
              <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${currentBadgeClass}`}>
                {currentStatus.replaceAll("_", " ")}
              </span>
            </div>

            <div className="space-y-1.5">
              {options.map((option) => {
                const isCurrent = option.value === currentStatus
                const isSelected = updating && isCurrent
                return (
                  <button
                    key={option.value}
                    data-autofocus={isCurrent}
                    onClick={() => {
                      if (isCurrent) return
                      onSelect(option.value)
                    }}
                    disabled={updating}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium capitalize transition-all disabled:cursor-not-allowed ${
                      isCurrent
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50"
                    }`}
                  >
                    <span className={`size-2 rounded-full ${option.dotClass}`} />
                    {option.label}
                    {isCurrent && <Check size={14} className="ml-auto" />}
                    {isSelected && <Loader2 size={14} className="ml-auto animate-spin" />}
                  </button>
                )
              })}
            </div>

            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
