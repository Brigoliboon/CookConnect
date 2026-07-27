"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import type { Subscription } from "@/constants"
import { CARB_OPTIONS } from "@/constants"
import { Carrot } from "lucide-react"

interface Props {
  subscriptions: Subscription[]
}

const COLORS = ["#118B50", "#79AE6F", "#C0EBA6", "#346739", "#2d8a4e", "#46b06e"]

export function CarbPreferenceChart({ subscriptions }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const sub of subscriptions) {
      const carb = (sub.details as Record<string, unknown>).preferredCarb as string | undefined
      if (carb) counts[carb] = (counts[carb] || 0) + 1
    }
    return Object.entries(counts).map(([value, count]) => ({
      name: CARB_OPTIONS.find((c) => c.value === value)?.label ?? value,
      value: count,
    }))
  }, [subscriptions])

  return (
    <div className="rounded-xl border border-border-light bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Carrot size={18} className="text-brand-900" />
        <h3 className="text-base font-semibold text-brand-900">Carb Preference</h3>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }} />
          <Legend iconType="circle" iconSize={10} formatter={(value) => <span className="text-sm text-text-secondary">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
