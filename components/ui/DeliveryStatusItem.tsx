import type { Delivery } from "@/constants"
import { CheckCircle, XCircle, PackageCheck } from "lucide-react"

interface DeliveryStatusItemProps {
  delivery: Delivery
}

export function DeliveryStatusItem({ delivery: d }: DeliveryStatusItemProps) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-brand-900">{d.customerName}</p>
          <p className="mt-1 text-sm text-text-secondary truncate">{d.customerAddress}</p>
          <p className="mt-1 text-base font-medium text-text-secondary">
            {d.note || "No instructions"}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tracking-wide uppercase ${
            d.intent === "today"
              ? "bg-green-100 text-green-800"
              : d.intent === "delivered"
                ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {d.intent === "today" && <CheckCircle size={16} />}
          {d.intent === "skip" && <XCircle size={16} />}
          {d.intent === "delivered" && <PackageCheck size={16} />}
          {d.intent}
        </span>
      </div>
    </div>
  )
}
