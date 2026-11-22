"use client"

import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface DetailSheetProps {
  title: string
  titleId?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function DetailSheet({ title, titleId = "detail-sheet-title", onClose, children, footer }: DetailSheetProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const body = (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,23,42,0.28)] md:left-24 max-md:bottom-[5.5rem]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 hidden w-[420px] flex-col rounded-l-2xl bg-white shadow-[-8px_0_32px_rgba(15,23,42,0.12)] md:flex"
      >
        <SheetChrome title={title} titleId={titleId} onClose={onClose} footer={footer}>
          {children}
        </SheetChrome>
      </aside>

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${titleId}-phone`}
        className="absolute inset-x-0 bottom-[5.5rem] flex max-h-[min(650px,calc(100dvh-6.5rem))] flex-col rounded-t-[20px] bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.16)] md:hidden"
      >
        <div className="mx-auto mt-2.5 h-1 w-12 shrink-0 rounded-full bg-[#CBD5E1]" />
        <SheetChrome title={title} titleId={`${titleId}-phone`} onClose={onClose} footer={footer}>
          {children}
        </SheetChrome>
      </aside>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(body, document.body)
}

function SheetChrome({
  title,
  titleId,
  onClose,
  children,
  footer,
}: {
  title: string
  titleId: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#F1F5F9] px-5 py-4">
        <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold tracking-tight text-[#0F172A]">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#475569] transition-colors hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
        >
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? <div className="shrink-0 border-t border-[#F1F5F9] px-5 py-3">{footer}</div> : null}
    </>
  )
}
