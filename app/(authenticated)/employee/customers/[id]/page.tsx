"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button, Input, Select } from "@/components/ui"
import { CUSTOMERS, CUSTOMER_STATUS_OPTIONS, SUBSCRIPTIONS } from "@/constants"
import type { Customer } from "@/constants"

export default function EmployeeCustomerPage() {
  const params = useParams()
  const router = useRouter()
  const customer = CUSTOMERS.find((c) => c.id === params.id)
  const subscription = SUBSCRIPTIONS.find((s) => s.customerId === params.id)

  const [form, setForm] = useState<Customer>(
    customer ?? {
      id: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      location: { lat: 0, lng: 0 },
      isActive: true,
      createdAt: "",
    }
  )

  function handleChange(field: keyof Customer, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    router.push("/employee/customers")
  }

  if (!customer) {
    return <p className="text-text-secondary">Customer not found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">{customer.name}</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/employee/customers")}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border-light bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Personal Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          <Input label="Phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
          <Select
            label="Status"
            options={CUSTOMER_STATUS_OPTIONS.map((o) => ({ ...o, value: o.value as string }))}
            value={form.isActive ? "true" : "false"}
            onChange={(e) => handleChange("isActive", e.target.value === "true")}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border-light bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Address</h2>
        <Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
        <p className="mt-2 text-xs text-text-secondary">
          Location: {form.location.lat.toFixed(4)}, {form.location.lng.toFixed(4)}
        </p>
      </div>

      <div className="rounded-xl border border-border-light bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Subscription</h2>
        {subscription ? (
          <div className="space-y-1 text-sm text-text-secondary">
            <p>Plan: {String((subscription.details as Record<string, unknown>).mealsPerWeek ?? "—")} meals/week</p>
            <p>Servings: {String((subscription.details as Record<string, unknown>).servingsPerMeal ?? "—")} per meal</p>
            <p>Preference: {String((subscription.details as Record<string, unknown>).dietaryPreference ?? "—")}</p>
            <p className="mt-2 text-xs">Created: {subscription.createdAt}</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No active subscription.</p>
        )}
      </div>
    </div>
  )
}
