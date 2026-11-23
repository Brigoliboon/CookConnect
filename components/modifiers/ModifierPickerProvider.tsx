"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import { addCartItem, type AddCartItemInput } from "@/utils/cart"
import {
  fetchRecipeAddons,
  type CartModifier,
  type MealAddTarget,
} from "@/lib/modifiers"
import { MobileAddonSheet, type AddonOption } from "@/components/landing/MobileAddonSheet"
import { ModifierPickerDialog } from "./ModifierPickerDialog"

type Destination = "cart" | "custom"

interface PickerSession {
  target: MealAddTarget
  destination: Destination
  initialPicks?: CartModifier[]
  resolve: (picks: CartModifier[] | null) => void
}

interface AddonSession {
  target: MealAddTarget
  resolve: (addon: AddonOption | null | undefined) => void
}

interface ModifierPickerContextValue {
  addMealToCart: (target: MealAddTarget) => Promise<boolean>
  pickModifiers: (
    target: MealAddTarget,
    options?: { initialPicks?: CartModifier[] },
  ) => Promise<CartModifier[] | null>
}

const ModifierPickerContext = createContext<ModifierPickerContextValue | null>(null)

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
}

export function ModifierPickerProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const [session, setSession] = useState<PickerSession | null>(null)
  const [addonSession, setAddonSession] = useState<AddonSession | null>(null)

  const pickModifiers = useCallback(
    (target: MealAddTarget, options?: { initialPicks?: CartModifier[] }) => {
      return new Promise<CartModifier[] | null>((resolve) => {
        setSession({
          target,
          destination: "custom",
          initialPicks: options?.initialPicks,
          resolve,
        })
      })
    },
    [],
  )

  const addMealToCart = useCallback(async (target: MealAddTarget): Promise<boolean> => {
    if (!target.recipeId) {
      addCartItem({ name: target.name, price: target.price, image: target.image })
      return true
    }

    if (target.hasModifiers) {
      const picks = await new Promise<CartModifier[] | null>((resolve) => {
        setSession({ target, destination: "cart", resolve })
      })
      if (!picks) return false
      const input: AddCartItemInput = {
        name: target.name,
        price: target.price,
        image: target.image,
        recipeId: target.recipeId,
        modifiers: picks,
      }
      addCartItem(input)
      return true
    }

    if (isMobileViewport() && target.hasAddons) {
      const addons = await fetchRecipeAddons(target.recipeId)
      if (addons.length > 0) {
        const addon = await new Promise<AddonOption | null | undefined>((resolve) => {
          setAddonSession({ target, resolve })
        })
        if (addon === undefined) return false
        addCartItem({
          name: target.name,
          price: target.price,
          image: target.image,
          recipeId: target.recipeId,
          addonRecipeId: addon?.addon_recipe_id ?? null,
          addonName: addon?.addon_name ?? null,
          addonExtra: addon?.extra_cents ?? 0,
        })
        return true
      }
    }

    addCartItem({
      name: target.name,
      price: target.price,
      image: target.image,
      recipeId: target.recipeId,
    })
    return true
  }, [])

  const value = useMemo(
    () => ({ addMealToCart, pickModifiers }),
    [addMealToCart, pickModifiers],
  )

  return (
    <ModifierPickerContext.Provider value={value}>
      {children}
      <ModifierPickerDialog
        target={session?.target ?? null}
        locale={locale}
        initialPicks={session?.initialPicks}
        onClose={() => {
          session?.resolve(null)
          setSession(null)
        }}
        onConfirm={(picks) => {
          session?.resolve(picks)
          setSession(null)
        }}
      />
      <MobileAddonSheet
        target={
          addonSession
            ? { recipeId: addonSession.target.recipeId, name: addonSession.target.name, price: addonSession.target.price }
            : null
        }
        onClose={() => {
          addonSession?.resolve(undefined)
          setAddonSession(null)
        }}
        onConfirm={(addon) => {
          addonSession?.resolve(addon)
          setAddonSession(null)
        }}
      />
    </ModifierPickerContext.Provider>
  )
}

export function useAddMealToCart() {
  const ctx = useContext(ModifierPickerContext)
  return (
    ctx?.addMealToCart ??
    (async (target: MealAddTarget) => {
      addCartItem({
        name: target.name,
        price: target.price,
        image: target.image,
        recipeId: target.recipeId || undefined,
      })
      return true
    })
  )
}

export function usePickModifiers() {
  const ctx = useContext(ModifierPickerContext)
  return ctx?.pickModifiers ?? (async () => null)
}

export function IsolatedModifierPicker({
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
  return (
    <ModifierPickerDialog
      target={target}
      locale={locale}
      initialPicks={initialPicks}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}
