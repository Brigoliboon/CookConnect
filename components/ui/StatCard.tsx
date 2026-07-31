import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200/60 bg-white/80 p-5 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50">
      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-sm">
        <Icon size={20} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-900">{value}</p>
    </div>
  )
}
