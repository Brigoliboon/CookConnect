"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  Banknote,
  Beef,
  Droplet,
  Ellipsis,
  Flame,
  ImageOff,
  Pencil,
  Trash2,
  Wheat,
} from "lucide-react"
import { imageVariant } from "@/lib/images"
import { formatAed, formatMacro, type MealListItem } from "./model"

interface MealRowProps {
  item: MealListItem
  toggling?: boolean
  onToggle: (item: MealListItem) => void
  onView: (item: MealListItem) => void
  onEdit: (item: MealListItem) => void
  onDelete: (item: MealListItem) => void
}

export function MealRow({ item, toggling, onToggle, onView, onEdit, onDelete }: MealRowProps) {
  const enabled = item.is_active ?? true
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div
      className={`flex items-center gap-3 border-t border-[#F1F5F9] py-2.5 first:border-t-0 md:min-h-[72px] ${
        enabled ? "" : "opacity-70"
      }`}
    >
      <button
        type="button"
        onClick={() => onView(item)}
        aria-label={item.image_path ? item.name : `No photo, ${item.name}`}
        className="flex size-14 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl bg-[#F1F5F9] text-[10px] font-medium leading-none text-[#475569] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
      >
        {item.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageVariant(item.image_path, 128)}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <ImageOff size={16} strokeWidth={1.75} />
            <span>No photo</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => onView(item)}
        className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
      >
        <div className="text-base font-semibold tracking-tight text-[#0F172A]">{item.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#475569]">
          <span className="inline-flex items-center gap-1">
            <Banknote size={14} strokeWidth={1.75} />
            {formatAed(item.price)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame size={14} strokeWidth={1.75} />
            {formatMacro(item.calories)} kcal
          </span>
          <span className="inline-flex items-center gap-1">
            <Beef size={14} strokeWidth={1.75} />
            P {formatMacro(item.protein)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Wheat size={14} strokeWidth={1.75} />
            C {formatMacro(item.carbs)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Droplet size={14} strokeWidth={1.75} />
            F {formatMacro(item.fats)}
          </span>
        </div>
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? "Enabled" : "Disabled"}: ${item.name}`}
        disabled={toggling}
        onClick={() => onToggle(item)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
          enabled ? "bg-[#15803D]" : "bg-[#64748B]"
        }`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-[left] ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label={`More actions for ${item.name}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-12 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#334155] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
        >
          <Ellipsis size={20} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
            <MenuItem
              onClick={() => {
                closeMenu()
                onView(item)
              }}
            >
              View details
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu()
                onEdit(item)
              }}
            >
              <Pencil size={16} className="text-[#475569]" />
              Edit
            </MenuItem>
            <MenuItem
              danger
              onClick={() => {
                closeMenu()
                onDelete(item)
              }}
            >
              <Trash2 size={16} />
              Delete
            </MenuItem>
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium hover:bg-[#F8FAFC] ${
        danger ? "text-[#9F1239]" : "text-[#1E293B]"
      }`}
    >
      {children}
    </button>
  )
}
