"use client"

import { Suspense } from "react"
import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"

export default function SubscriptionOnboardingPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-10">
      <Suspense>
        <SubscriptionForm />
      </Suspense>
    </div>
  )
}
