"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { Subscription } from "@/constants"
import { restrictionDisplayLabels } from "@/lib/subscription/restrictions"
import { Ban } from "lucide-react"

interface Props {
  subscriptions: Subscription[]
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"]

export function RestrictionsChart({ subscriptions }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const sub of subscriptions) {
      for (const label of restrictionDisplayLabels(sub.details as Record<string, unknown>)) {
        counts[label] = (counts[label] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
  }, [subscriptions])

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border-light bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Ban size={18} className="text-brand-900" />
          <h3 className="text-base font-semibold text-brand-900">Food Restrictions</h3>
        </div>
        <p className="mt-6 text-center text-sm text-text-secondary">No restrictions recorded</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border-light bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Ban size={18} className="text-brand-900" />
        <h3 className="text-base font-semibold text-brand-900">Food Restrictions</h3>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#4b5563" }} width={120} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}
            formatter={(value) => [value, "Subscribers"]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
