"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

interface ModifierGroupSummary {
  id: string
  name: string
  name_ar: string | null
  is_active: boolean
  options: { id: string; name: string; is_active: boolean; is_default: boolean }[]
}

interface MealModifierAttachFieldProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function MealModifierAttachField({
  selectedIds,
  onChange,
  disabled = false,
}: MealModifierAttachFieldProps) {
  const [groups, setGroups] = useState<ModifierGroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/meal-modifiers/groups")
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error((payload as { error?: string }).error ?? "Failed to load modifier groups")
        return (payload as { data?: ModifierGroupSummary[] }).data ?? []
      })
      .then((data) => {
        if (!cancelled) {
          setGroups(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load modifier groups")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggle(id: string, checked: boolean) {
    if (checked) {
      if (selectedIds.includes(id)) return
      onChange([...selectedIds, id])
    } else {
      onChange(selectedIds.filter((value) => value !== id))
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-base font-semibold text-neutral-800">Modifier groups</label>
        <Link
          href="/employee/meals/modifiers"
          className="text-xs font-medium text-[#15803D] hover:underline"
        >
          Manage groups
        </Link>
      </div>
      <p className="mb-2 text-xs text-neutral-500">
        Required when attached. Use this for sides, spice level, or any other pick-one choice.
      </p>
      <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-neutral-200 p-3">
        {loading ? (
          <p className="text-sm text-neutral-400">Loading groups...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-neutral-400">No modifier groups yet. Create one under Manage groups.</p>
        ) : (
          groups.map((group) => {
            const checked = selectedIds.includes(group.id)
            const optionPreview = group.options
              .filter((option) => option.is_active)
              .map((option) => option.name)
              .join(", ")
            return (
              <label key={group.id} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => toggle(group.id, e.target.checked)}
                  className="mt-0.5 size-4 cursor-pointer accent-neutral-900"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-neutral-800">
                    {group.name}
                    {!group.is_active && (
                      <span className="ml-1.5 text-[11px] font-medium text-neutral-400">Inactive</span>
                    )}
                  </span>
                  {optionPreview ? (
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">{optionPreview}</span>
                  ) : (
                    <span className="mt-0.5 block text-xs text-amber-700">No active options yet</span>
                  )}
                </span>
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
