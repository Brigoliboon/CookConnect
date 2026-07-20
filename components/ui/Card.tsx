import { HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
}

export function Card({ title, children, className = "", ...props }: CardProps) {
  return (
    <div className={`rounded-xl bg-bg-card border border-border-light p-6 ${className}`} {...props}>
      {title && <h2 className="text-lg font-semibold text-brand-900 mb-4">{title}</h2>}
      {children}
    </div>
  )
}
