// ESC/POS command builder for thermal receipt printers.
// See https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/

export type TextAlign = "left" | "center" | "right"

export interface QrOptions {
  size?: number // module size in dots (1–16), default 6
  errorLevel?: "L" | "M" | "Q" | "H"
}

const CHAR_WIDTH = 12 // dots per char in default font
const DEFAULT_DOTS = 384 // 58mm printer

export class EscPosBuilder {
  private bytes: number[] = []
  private columns = Math.floor(DEFAULT_DOTS / CHAR_WIDTH)

  constructor(dots = DEFAULT_DOTS) {
    this.columns = Math.floor(dots / CHAR_WIDTH)
  }

  init(): this {
    this.bytes.push(0x1b, 0x40) // ESC @
    return this
  }

  // raw(text) pushes the UTF-8 bytes of a string, dropping unsupported chars.
  raw(text: string): this {
    for (const ch of text) {
      const code = ch.codePointAt(0)
      if (code != null && code <= 0xff) this.bytes.push(code)
    }
    return this
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) this.bytes.push(0x0a) // LF
    return this
  }

  feedDots(dots: number): this {
    this.bytes.push(0x1b, 0x4a, dots & 0xff) // ESC J n
    return this
  }

  align(align: TextAlign): this {
    const n = align === "left" ? 0 : align === "center" ? 1 : 2
    this.bytes.push(0x1b, 0x61, n) // ESC a n
    return this
  }

  bold(on: boolean): this {
    this.bytes.push(0x1b, 0x45, on ? 1 : 0) // ESC E n
    return this
  }

  size(w = 1, h = 1): this {
    const n = (w > 1 ? 0x10 : 0) | (h > 1 ? 0x20 : 0)
    this.bytes.push(0x1b, 0x21, n) // ESC ! n
    return this
  }

  cut(partial = true): this {
    this.bytes.push(0x1d, 0x56, partial ? 1 : 0) // GS V n
    return this
  }

  // qr encodes text using the standard GS ( k QR sequence.
  qr(text: string, opts: QrOptions = {}): this {
    const { size = 6, errorLevel = "M" } = opts
    const errCode = { L: 48, M: 49, Q: 50, H: 51 }[errorLevel]

    this.bytes.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00) // model 2
    this.bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size & 0xff) // module size
    this.bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, errCode) // error correction

    const data = new TextEncoder().encode(text)
    const len = data.length + 3
    this.bytes.push(
      0x1d, 0x28, 0x6b,
      len & 0xff, (len >> 8) & 0xff,
      0x31, 0x50, 0x30,
    )
    for (const b of data) this.bytes.push(b)

    this.bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30) // print
    return this
  }

  // text renders a single line, wrapping to the configured column width.
  text(content: string, opts: { align?: TextAlign; bold?: boolean } = {}): this {
    const { align = "left", bold = false } = opts
    const width = this.columns

    this.bold(bold).align(align)
    for (const line of wrapText(content, width)) {
      const padded = padLine(line, width, align)
      this.raw(padded)
      this.feed()
    }
    return this
  }

  // rule prints a dashed horizontal line.
  rule(): this {
    this.raw("-".repeat(this.columns))
    this.feed()
    return this
  }

  // row renders two columns padded to the full width.
  row(left: string, right: string, opts: { bold?: boolean } = {}): this {
    const width = this.columns
    const leftWidth = Math.max(0, width - Math.min(right.length, width))
    const l = truncate(left, leftWidth)
    const r = truncate(right, width - l.length)
    this.bold(opts.bold ?? false).align("left")
    this.raw(padRight(l, leftWidth) + r)
    this.feed()
    return this
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }
}

export function wrapText(text: string, width: number): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (!cleaned) return [""]
  const lines: string[] = []
  for (const word of cleaned.split(" ")) {
    const last = lines[lines.length - 1]
    if (!last) {
      lines.push(word)
    } else if ((last + " " + word).length <= width) {
      lines[lines.length - 1] = last + " " + word
    } else {
      lines.push(word)
    }
  }
  return lines
}

export function padRight(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length)
}

export function padLine(text: string, width: number, align: TextAlign): string {
  if (text.length >= width) return text.slice(0, width)
  const diff = width - text.length
  if (align === "center") {
    const left = Math.floor(diff / 2)
    return " ".repeat(left) + text + " ".repeat(diff - left)
  }
  if (align === "right") return " ".repeat(diff) + text
  return text + " ".repeat(diff)
}

export function truncate(text: string, width: number): string {
  if (text.length <= width) return text
  return text.slice(0, Math.max(0, width - 1)) + "."
}

export function money(cents: number): string {
  return (cents / 100).toFixed(2)
}
