import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect("/login")
  if (user.role !== "rider") redirect(`/${user.role}`)

  return <>{children}</>
}
