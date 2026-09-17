import { setRequestLocale } from "next-intl/server"
import dynamic from "next/dynamic"
import { Nav } from "@/components/landing/Nav"
import { Hero } from "@/components/landing/Hero"
import { FeaturedMeals } from "@/components/landing/FeaturedMeals"
import { RestaurantJsonLd } from "@/components/seo/RestaurantJsonLd"

const HealthyCampaign = dynamic(
  () => import("@/components/landing/HealthyCampaign").then((mod) => mod.HealthyCampaign),
  { loading: () => <section id="diet" className="min-h-[400px] px-8 py-32" aria-label="Loading" /> },
)
const Subscription = dynamic(
  () => import("@/components/landing/Subscription").then((mod) => mod.Subscription),
  { loading: () => <section id="subscription" className="min-h-[400px] bg-neutral-50 px-6 py-32" aria-label="Loading" /> },
)
const AboutUs = dynamic(() => import("@/components/landing/AboutUs").then((mod) => mod.AboutUs), {
  loading: () => <section id="about" className="min-h-[400px] bg-white px-6 py-32" aria-label="Loading" />,
})
const Contact = dynamic(() => import("@/components/landing/Contact").then((mod) => mod.Contact), {
  loading: () => <section id="contact" className="min-h-[400px] bg-neutral-50 px-8 py-32" aria-label="Loading" />,
})
const Footer = dynamic(() => import("@/components/landing/Footer").then((mod) => mod.Footer), {
  loading: () => <footer className="min-h-[200px] border-t border-neutral-200 bg-white px-6 py-10" />,
})

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
