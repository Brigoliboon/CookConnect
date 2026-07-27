interface BarcodeProps {
  code: string
}

export function Barcode({ code }: BarcodeProps) {
  const bars = code.split("").map((c) => {
    const n = parseInt(c, 36) % 7
    return Math.max(n, 1)
  })

  return (
    <div className="flex items-center gap-[2px]">
      <div className="h-10 w-[3px] bg-neutral-800 rounded" />
      {bars.map((w, i) => (
        <div
          key={i}
          className="bg-neutral-800 rounded"
          style={{ width: `${w}px`, height: `${10 + (w % 3) * 6}px` }}
        />
      ))}
      <div className="h-10 w-[3px] bg-neutral-800 rounded" />
    </div>
  )
}
