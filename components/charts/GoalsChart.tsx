"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { Subscription } from "@/constants"
import { GOALS } from "@/constants"
import { Target } from "lucide-react"

interface Props {
  subscriptions: Subscription[]
}

const COLORS = ["#118B50", "#79AE6F", "#C0EBA6", "#346739", "#2d8a4e"]

export function GoalsChart({ subscriptions }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const sub of subscriptions) {
      const goal = (sub.details as Record<string, unknown>).goal as string | undefined
      if (goal) counts[goal] = (counts[goal] || 0) + 1
    }
    return Object.entries(counts)
      .map(([value, count]) => ({
        name: GOALS.find((g) => g.value === value)?.label ?? value,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
  }, [subscriptions])

  return (
    <div className="rounded-xl border border-border-light bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Target size={18} className="text-brand-900" />
        <h3 className="text-base font-semibold text-brand-900">Subscriptions by Goal</h3>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#4b5563" }} width={130} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}
            formatter={(value) => [value, "Subscriptions"]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
