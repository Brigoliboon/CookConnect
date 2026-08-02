"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ShoppingCart } from "lucide-react"
import { getCartCount } from "@/utils/cart"

interface CartButtonProps {
  mobile?: boolean
  onOpen: () => void
}

export function CartButton({ mobile = false, onOpen }: CartButtonProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const update = () => setCount(getCartCount())
    update()
    window.addEventListener("storage", update)
    window.addEventListener("cart-changed", update)
    return () => {
      window.removeEventListener("storage", update)
      window.removeEventListener("cart-changed", update)
    }
  }, [])

  const onClick = useCallback(() => {
    onOpen()
  }, [onOpen])

  return (
    <button
      onClick={onClick}
      className="relative rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
      aria-label="Open cart"
    >
      <ShoppingCart size={mobile ? 17 : 17} />
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
        >
          {count}
        </motion.span>
      )}
    </button>
  )
}