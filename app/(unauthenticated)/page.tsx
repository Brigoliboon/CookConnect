import { Nav } from "@/components/landing/Nav"
import { Hero } from "@/components/landing/Hero"
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
      <HealthyCampaign />
      <Subscription />
      <AboutUs />
      <Contact />
      <Footer />
    </>
  )
}
