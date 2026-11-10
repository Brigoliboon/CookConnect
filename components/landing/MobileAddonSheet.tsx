"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, X } from "lucide-react"
import { useTranslations } from "next-intl"

export interface AddonOption {
  id: string
  meal_recipe_id: string
  addon_recipe_id: string
  extra_cents: number
  is_default: boolean
  addon_name: string
  addon_image_path: string | null
}

export interface AddonTarget {
  recipeId: string
  name: string
  price: number
}

/**
 * Mobile bottom sheet for picking a rice/side before a meal is added to the
 * cart. Confirming with no selection adds the meal without an addon.
 */
export function MobileAddonSheet({
  target,
  onClose,
  onConfirm,
}: {
  target: AddonTarget | null
  onClose: () => void
  onConfirm: (addon: AddonOption | null) => void
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

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label={target.name}
            className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <AddonSheetBody key={target.recipeId} target={target} onClose={onClose} onConfirm={onConfirm} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AddonSheetBody({
  target,
  onClose,
  onConfirm,
}: {
  target: AddonTarget
  onClose: () => void
  onConfirm: (addon: AddonOption | null) => void
}) {
  const t = useTranslations("cart")
  const mt = useTranslations("meals")
  const [options, setOptions] = useState<AddonOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/recipe-addons?meal_id=${target.recipeId}`)
      .then(async (res) => (res.ok ? res.json() : { data: [] }))
      .then(({ data }: { data?: AddonOption[] }) => {
        if (cancelled) return
        const list = data ?? []
        setOptions(list)
        const preferred = list.find((opt) => opt.is_default) ?? list[0]
        setSelectedId(preferred?.addon_recipe_id ?? null)
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [target.recipeId])

  const selected = options.find((opt) => opt.addon_recipe_id === selectedId) ?? null
  const total = target.price + (selected?.extra_cents ?? 0) / 100

  return (
    <>
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-neutral-200" />

      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            {t("sidesTitle")}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-bold text-neutral-900">{target.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X size={18} />
        </button>
      </div>

      <div className="max-h-[45vh] overflow-y-auto px-4 pb-3">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        ) : options.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">{t("sidesEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {options.map((opt) => {
              const active = selectedId === opt.addon_recipe_id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedId(opt.addon_recipe_id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
                    active ? "border-brand-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  {opt.addon_image_path ? (
                    <img
                      src={opt.addon_image_path}
                      alt={opt.addon_name}
                      width={48}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded-lg bg-neutral-100" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900">
                      {opt.addon_name}
                    </span>
                    <span className="block text-[11px] text-neutral-500">
                      {opt.extra_cents === 0 ? "Free" : `+${(opt.extra_cents / 100).toFixed(2)} AED`}
                    </span>
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
        )}
      </div>

      <div className="border-t border-neutral-100 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {t("total")}
            </p>
            <p className="text-base font-bold text-brand-900">{total.toFixed(2)} AED</p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(selected)}
            className="min-w-36 bg-brand-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
          >
            {mt("add")}
          </button>
        </div>
      </div>
    </>
  )
}
