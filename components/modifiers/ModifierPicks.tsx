"use client"

import { formatAddonAed, localizedName, type CartModifier } from "@/lib/modifiers"

export function ModifierPicks({
  modifiers,
  locale = "en",
  className = "",
}: {
  modifiers: CartModifier[]
  locale?: string
  className?: string
}) {
  if (!modifiers.length) return null
  return (
    <ul className={`space-y-0.5 text-xs text-neutral-500 ${className}`}>
      {modifiers.map((pick) => {
        const surcharge = formatAddonAed(pick.priceCents)
        return (
          <li key={`${pick.groupId}:${pick.optionId}`}>
            <span className="text-neutral-400">
              {localizedName(pick.groupName, pick.groupNameAr, locale)}:{" "}
            </span>
            <span className="font-medium text-neutral-700">
              {localizedName(pick.optionName, pick.optionNameAr, locale)}
            </span>
            {surcharge ? <span> ({surcharge})</span> : null}
          </li>
        )
      })}
    </ul>
  )
}
