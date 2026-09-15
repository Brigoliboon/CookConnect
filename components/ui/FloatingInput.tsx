"use client"

import { InputHTMLAttributes, ReactNode } from "react"

interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  label: string
  error?: string
  icon?: ReactNode
}

export function FloatingInput({ label, error, icon, className = "", id, ...props }: FloatingInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <input
          id={inputId}
          placeholder=" "
          className={`peer w-full rounded-xl border bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder-transparent focus:border-neutral-900 disabled:bg-neutral-50 ${
            error ? "border-red-500" : "border-neutral-200"
          } ${className}`}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-3 -top-2.5 flex items-center gap-1 bg-white px-1 text-xs font-semibold text-neutral-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-neutral-400 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-neutral-900"
        >
          {icon}
          {label}
          {props.required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
