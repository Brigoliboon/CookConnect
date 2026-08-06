import { EscPosBuilder, money } from "./escpos"

export interface ReceiptItem {
  name: string
  qty: number
  unit_price_cents: number
}

export interface ReceiptOrder {
  id: string
  name: string
  email: string
  mobileNumber: string
  address: string | null
  status: string
  subtotalCents: number
  shippingCents: number
  currency: string
  createdAt: string
  items: ReceiptItem[]
}

export interface ReceiptOptions {
  storeName?: string
  storeTagline?: string
  storePhone?: string
  /** Show the QR code linking to the order. Default: true */
  includeQr?: boolean
  /** Printer dot width. Default: 384 (58mm). Pass 576 for 80mm. */
  dots?: number
}

const DEFAULT_OPTS: Required<Pick<ReceiptOptions, "storeName" | "storeTagline" | "storePhone" | "includeQr" | "dots">> = {
  storeName: "CookConnect",
  storeTagline: "Fresh meals, delivered daily",
  storePhone: "",
  includeQr: true,
  dots: 384,
}

function orderTotal(o: ReceiptOrder): number {
  return o.subtotalCents + o.shippingCents
}

/**
 * Composes a kitchen/order receipt from an order and renders it to ESC/POS
 * bytes ready for a wireless thermal printer.
 */
export function buildOrderReceipt(
  order: ReceiptOrder,
  options: ReceiptOptions = {},
): Uint8Array {
  const opts = { ...DEFAULT_OPTS, ...options }
  const p = new EscPosBuilder(opts.dots)

  p.init()

  p.feed(2)
  p.text(opts.storeName, { align: "center", bold: true })
  if (opts.storeTagline) p.text(opts.storeTagline, { align: "center" })
  if (opts.storePhone) p.text(`Tel: ${opts.storePhone}`, { align: "center" })
  p.feed(1)
  p.rule()

  p.row("ORDER", "#" + order.id.slice(0, 8).toUpperCase())
  p.row("Date", order.createdAt)
  p.rule()

  p.text("BILL TO", { align: "center", bold: true })
  p.feed(1)
  p.text(order.name)
  p.text(order.mobileNumber)
  if (order.email) p.text(order.email)
  if (order.address) p.text(order.address)
  p.feed(1)
  p.rule()

  p.text("ITEMS", { align: "center", bold: true })
  p.feed(1)
  for (const item of order.items) {
    p.text(item.name)
    p.row(
      `  ${item.qty} x ${money(item.unit_price_cents)}`,
      money(item.unit_price_cents * item.qty),
    )
  }
  p.feed(1)
  p.rule()

  p.row("Subtotal", money(order.subtotalCents))
  if (order.shippingCents > 0) {
    p.row("Delivery", money(order.shippingCents))
  }
  p.row("TOTAL", money(orderTotal(order)), { bold: true })

  p.feed(2)
  if (opts.includeQr) {
    p.align("center")
    p.qr(order.id, { size: 6, errorLevel: "M" })
    p.feed(1)
    p.text(`Order: ${order.id.slice(0, 8).toUpperCase()}`, { align: "center" })
    p.feed(1)
  }

  p.text("Thank you!", { align: "center", bold: true })
  p.feed(3)
  p.cut(true)

  return p.toBytes()
}
