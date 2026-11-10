import { redirect } from "next/navigation"

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const query = await searchParams
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item)
    } else if (value !== undefined) {
      search.set(key, value)
    }
  }

  const queryString = search.toString()
  const path = `${locale === "en" ? "" : `/${locale}`}/subscription-onboarding`
  redirect(queryString ? `${path}?${queryString}` : path)
}
