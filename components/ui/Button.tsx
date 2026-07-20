import { ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-brand-900 text-white hover:bg-brand-700",
  secondary: "bg-brand-400 text-white hover:bg-brand-700",
  outline: "border border-brand-900 text-brand-900 hover:bg-brand-900 hover:text-white",
  ghost: "text-brand-900 hover:bg-brand-400/20",
  danger: "bg-red-600 text-white hover:bg-red-700",
}

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    />
  )
}
