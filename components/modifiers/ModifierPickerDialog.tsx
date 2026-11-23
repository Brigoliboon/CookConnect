"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, X } from "lucide-react"
import {
  activeModifierGroups,
  allGroupsPicked,
  defaultSelection,
  fetchMealModifierGroups,
  formatAddonAed,
  localizedName,
  picksFromSelection,
  unitPriceAed,
  type CartModifier,
  type MealAddTarget,
  type ModifierGroupView,
} from "@/lib/modifiers"

export const PICKER_COPY = {
  en: {
    title: "Choose your options",
    total: "Total",
    add: "Add",
    close: "Close",
    unavailable: "This meal can't be ordered until its options are available.",
    loadError: "Could not load options. Try again.",
  },
  ar: {
    title: "اختر الإضافات",
    total: "الإجمالي",
    add: "أضف",
    close: "إغلاق",
    unavailable: "لا يمكن طلب هذه الوجبة حتى تتوفر خياراتها.",
    loadError: "تعذر تحميل الخيارات. حاول مرة أخرى.",
  },
} as const

export function ModifierPickerDialog({
  target,
  locale = "en",
  initialPicks,
  onClose,
  onConfirm,
}: {
  target: MealAddTarget | null
  locale?: string
  initialPicks?: CartModifier[]
  onClose: () => void
  onConfirm: (picks: CartModifier[]) => void
}) {
  useEffect(() => {
    if (!target) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [target, onClose])

  const isAr = locale === "ar"

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label={target.name}
            dir={isAr ? "rtl" : "ltr"}
            className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <PickerBody
              key={`${target.recipeId}:${initialPicks?.map((p) => p.optionId).join(",") ?? ""}`}
              target={target}
              locale={locale}
              initialPicks={initialPicks}
              onClose={onClose}
              onConfirm={onConfirm}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PickerBody({
  target,
  locale,
  initialPicks,
  onClose,
  onConfirm,
}: {
  target: MealAddTarget
  locale: string
  initialPicks?: CartModifier[]
  onClose: () => void
  onConfirm: (picks: CartModifier[]) => void
}) {
  const copy = locale === "ar" ? PICKER_COPY.ar : PICKER_COPY.en
  const [groups, setGroups] = useState<ModifierGroupView[] | null>(null)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    fetchMealModifierGroups(target.recipeId)
      .then((data) => {
        if (cancelled) return
        const active = activeModifierGroups(data)
        setGroups(active)
        if (initialPicks?.length) {
          const fromPicks: Record<string, string> = {}
          for (const pick of initialPicks) fromPicks[pick.groupId] = pick.optionId
          setSelected({ ...defaultSelection(active), ...fromPicks })
        } else {
          setSelected(defaultSelection(active))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGroups([])
          setError(copy.loadError)
        }
      })
    return () => {
      cancelled = true
    }
  }, [target.recipeId, copy.loadError, initialPicks])

  const loading = groups === null
  const unavailable = !!groups && groups.some((group) => group.options.length === 0)
  const ready = !!groups && groups.length > 0 && allGroupsPicked(groups, selected) && !unavailable
  const picks = useMemo(
    () => (groups ? picksFromSelection(groups, selected) : []),
    [groups, selected],
  )
  const total = unitPriceAed(target.price, picks)

  return (
    <>
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-neutral-200 sm:hidden" />

      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            {copy.title}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-bold text-neutral-900">{target.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X size={18} />
        </button>
      </div>

      <div className="max-h-[55vh] overflow-y-auto px-4 pb-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
                <div className="h-12 animate-pulse rounded-xl bg-neutral-100" />
                <div className="h-12 animate-pulse rounded-xl bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-neutral-500">{error}</p>
        ) : unavailable || !groups?.length ? (
          <p className="py-6 text-center text-sm text-neutral-500">{copy.unavailable}</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <fieldset key={group.id} className="min-w-0">
                <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  {localizedName(group.name, group.name_ar, locale)}
                </legend>
                <div className="space-y-2">
                  {group.options.map((option) => {
                    const active = selected[group.id] === option.id
                    const surcharge = formatAddonAed(option.price_cents)
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelected((prev) => ({ ...prev, [group.id]: option.id }))}
                        className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                          active ? "border-brand-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-neutral-900">
                            {localizedName(option.name, option.name_ar, locale)}
                          </span>
                          {surcharge && (
                            <span className="block text-[11px] text-neutral-500">{surcharge}</span>
                          )}
                        </span>
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                            active ? "border-brand-900 bg-brand-900 text-white" : "border-neutral-300 text-transparent"
                          }`}
                        >
                          <Check size={12} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-100 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {copy.total}
            </p>
            <p className="text-base font-bold text-brand-900">{total.toFixed(2)} AED</p>
          </div>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onConfirm(picks)}
            className="min-w-36 bg-brand-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.add}
          </button>
        </div>
      </div>
    </>
  )
}
