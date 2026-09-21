"use client"

import { Suspense } from "react"
import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <Suspense>
        <SubscriptionForm />
      </Suspense>
    </div>
  )
}
