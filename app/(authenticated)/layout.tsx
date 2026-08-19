import { fontVariables } from "@/lib/fonts"
import { Providers } from "../providers"
import { Navbar } from "@/components/layout/Navbar"
import "../globals.css"

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 p-6 pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  )
}