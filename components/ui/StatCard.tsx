import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-5">
      <Icon size={28} className="text-brand-400" />
      <p className="mt-4 text-sm font-medium text-text-secondary tracking-wide uppercase">{label}</p>
      <p className="mt-1 text-4xl font-bold text-brand-900">{value}</p>
    </div>
  )
}
