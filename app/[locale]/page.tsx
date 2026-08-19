import { Nav } from "@/components/landing/Nav"
import { Hero } from "@/components/landing/Hero"
import { FeaturedMeals } from "@/components/landing/FeaturedMeals"
import { HealthyCampaign } from "@/components/landing/HealthyCampaign"
import { Subscription } from "@/components/landing/Subscription"
import { AboutUs } from "@/components/landing/AboutUs"
import { Contact } from "@/components/landing/Contact"
import { Footer } from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <>
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
