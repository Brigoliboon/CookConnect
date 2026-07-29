import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect("/login")
  if (user.role !== "customer") redirect(`/${user.role}`)

  return <>{children}</>
}
