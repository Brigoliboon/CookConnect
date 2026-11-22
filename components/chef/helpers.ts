import { addCalendarDays, toISODate } from "@/lib/chef/day"

const TITLE_SKIP = new Set(["sir", "mam", "mr", "mrs", "ms", "miss"])

export const AVATAR_TONES = [
  { bg: "bg-[#FCE7F3]", text: "text-[#9D174D]" },
  { bg: "bg-[#DBEAFE]", text: "text-[#1E3A8A]" },
  { bg: "bg-[#E0E7FF]", text: "text-[#3730A3]" },
  { bg: "bg-[#CCFBF1]", text: "text-[#115E59]" },
  { bg: "bg-[#FFEDD5]", text: "text-[#9A3412]" },
  { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]" },
  { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
] as const

export const FOOD_TONES: Record<string, { bg: string; text: string }> = {
  chicken: { bg: "bg-[#FFEDD5]", text: "text-[#9A3412]" },
  beef: { bg: "bg-[#FEE2E2]", text: "text-[#9F1239]" },
  burgers: { bg: "bg-[#FEE2E2]", text: "text-[#9F1239]" },
  breakfast: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  egg: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  seafood: { bg: "bg-[#DBEAFE]", text: "text-[#1E3A8A]" },
  salad: { bg: "bg-[#DCFCE7]", text: "text-[#14532D]" },
  vegetable: { bg: "bg-[#DCFCE7]", text: "text-[#14532D]" },
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function startOfWeek(iso: string): string {
  const date = parseISODate(iso)
  return toISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay()))
}

export function weekDates(iso: string): string[] {
  const start = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index))
}

export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  })
}

export function formatMonthYear(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

export function weekdayShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => !TITLE_SKIP.has(part.toLowerCase()) && !/^\d+$/.test(part))
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function avatarTone(key: string): (typeof AVATAR_TONES)[number] {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

export function foodTone(category: string | null | undefined): { bg: string; text: string } {
  const key = (category ?? "").toLowerCase()
  return FOOD_TONES[key] ?? { bg: "bg-[#F1F5F9]", text: "text-[#334155]" }
}

export function slotLabel(slot: string): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1)
}
