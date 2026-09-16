import type { Metadata } from "next"
import { fontVariables } from "@/lib/fonts"
import { Providers } from "../providers"
import { Navbar } from "@/components/layout/Navbar"
import { AuthMain } from "@/components/layout/AuthMain"
import "../globals.css"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Navbar />
          <AuthMain>{children}</AuthMain>
        </Providers>
      </body>
    </html>
  )
}