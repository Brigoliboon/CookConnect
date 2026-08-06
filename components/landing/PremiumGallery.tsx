"use client"

import { useState, useEffect, useRef, Children, type ReactElement, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

function defaultGetItemsPerPage(width: number) {
  if (width < 640) return 1
  if (width < 1024) return 2
  return 5
}

interface PremiumGalleryProps {
  children: ReactNode
  getItemsPerPage?: (width: number) => number
  className?: string
  trackClassName?: string
  itemScale:number
}

export function PremiumGallery({
  children,
  getItemsPerPage = defaultGetItemsPerPage,
  className = "",
  trackClassName = "",
  itemScale = 1,
}: PremiumGalleryProps) {
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const itemsPerPageRef = useRef(itemsPerPage)

  useEffect(() => {
    itemsPerPageRef.current = itemsPerPage
  }, [itemsPerPage])

  useEffect(() => {
    const update = () => {
      const next = getItemsPerPage(window.innerWidth)
      if (next !== itemsPerPageRef.current) {
        setItemsPerPage(next)
        setPage(0)
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [getItemsPerPage])

  const items = Children.toArray(children) as ReactElement[]
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))
  const start = page * itemsPerPage
  const visible = itemsPerPage < 2 ? items : items.slice(start, start + itemsPerPage)

  return (
    <div className={`relative ${className}`}>
      {totalPages > 1 && (
        <div className="max-sm:hidden">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="absolute -left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white disabled:opacity-30 max-sm:-left-2 max-sm:size-8"
            aria-label="Previous"
          >
            <ChevronLeft size={18} className="text-neutral-800 max-sm:size-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="absolute -right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white disabled:opacity-30 max-sm:-right-2 max-sm:size-8"
            aria-label="Next"
          >
            <ChevronRight size={18} className="text-neutral-800 max-sm:size-4" />
          </button>
        </div>
      )}

      <div
        className={`flex items-stretch gap-8 overflow-hidden pb-2 max-sm:-mx-4 max-sm:justify-start max-sm:overflow-x-auto max-sm:gap-5 max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-smooth max-sm:px-4 ${trackClassName}`}
      >
        <AnimatePresence mode="wait">
          {visible.map((item, i) => (
            <motion.div
              key={item.key ?? i}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="shrink-0 max-sm:snap-center"
              style={{scale:itemScale}}
            >
              {item}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
