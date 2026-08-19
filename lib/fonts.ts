import { Geist, Geist_Mono, Playfair_Display, Nunito_Sans, Open_Sans, Cairo } from "next/font/google"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] })
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"] })
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"] })
const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"] })

export const fontVariables = [
  geist.variable,
  mono.variable,
  playfair.variable,
  nunito.variable,
  openSans.variable,
  cairo.variable,
].join(" ")