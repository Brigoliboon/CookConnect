"use client"

import { motion } from "framer-motion"
import type { Delivery } from "@/constants"
import { CheckCircle, XCircle, PackageCheck } from "lucide-react"

interface DeliveryStatusItemProps {
  delivery: Delivery
  index: number
}

const intentStyles: Record<string, string> = {
  today: "bg-green-600 text-white",
  delivered: "bg-blue-600 text-white",
  skip: "bg-orange-500 text-white",
}

const intentIcons: Record<string, React.ReactNode> = {
  today: <CheckCircle size={14} />,
  skip: <XCircle size={14} />,
  delivered: <PackageCheck size={14} />,
}

export function DeliveryStatusItem({ delivery: d, index }: DeliveryStatusItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="group rounded-2xl border border-neutral-200/60 bg-white/80 p-5 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900">{d.customerName}</p>
          <p className="mt-0.5 text-sm text-neutral-500 truncate">{d.customerAddress}</p>
          <p className="mt-1 text-sm text-neutral-400">
            {d.note || "No instructions"}
          </p>
        </div>
        <span className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${intentStyles[d.intent] ?? "bg-neutral-100 text-neutral-600"}`}>
          {intentIcons[d.intent]}
          {d.intent}
        </span>
      </div>
    </motion.div>
  )
}
