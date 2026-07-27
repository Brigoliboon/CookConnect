"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { Subscription } from "@/constants"
import { ChefHat } from "lucide-react"

interface Props {
  subscriptions: Subscription[]
}

const COLORS = ["#118B50", "#79AE6F", "#C0EBA6", "#346739", "#2d8a4e", "#3a9d5e", "#46b06e", "#52c37e"]

export function PopularMealsChart({ subscriptions }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const sub of subscriptions) {
      const meals = (sub.details as Record<string, unknown>).includedMeals as string[] | undefined
      if (meals) {
        for (const meal of meals) {
          counts[meal] = (counts[meal] || 0) + 1
        }
      }
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [subscriptions])

  return (
    <div className="rounded-xl border border-border-light bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ChefHat size={18} className="text-brand-900" />
        <h3 className="text-base font-semibold text-brand-900">Popular Meals</h3>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#4b5563" }} width={150} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}
            formatter={(value) => [value, "Subscriptions"]}
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
