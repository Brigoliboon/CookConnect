import { Navbar } from "@/components/layout/Navbar"

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 p-6">{children}</main>
    </>
  )
}
