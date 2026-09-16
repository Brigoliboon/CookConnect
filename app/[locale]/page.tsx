import { setRequestLocale } from "next-intl/server"
import { Nav } from "@/components/landing/Nav"
import { Hero } from "@/components/landing/Hero"
import { FeaturedMeals } from "@/components/landing/FeaturedMeals"
import { HealthyCampaign } from "@/components/landing/HealthyCampaign"
import { Subscription } from "@/components/landing/Subscription"
import { AboutUs } from "@/components/landing/AboutUs"
import { Contact } from "@/components/landing/Contact"
import { Footer } from "@/components/landing/Footer"
import { RestaurantJsonLd } from "@/components/seo/RestaurantJsonLd"

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <>
      <RestaurantJsonLd locale={locale} />
      <Nav />
      <Hero />
      <FeaturedMeals />
      <div className="pointer-events-none relative -mt-5 z-10 h-6 w-full bg-gradient-to-t from-white via-black/30 to-black/60 backdrop-blur-md" />
      <HealthyCampaign />
      <Subscription />
      <AboutUs />
      <Contact />
      <Footer />
    </>
  )
}
