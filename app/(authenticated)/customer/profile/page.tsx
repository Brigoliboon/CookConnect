"use client"

import { useState } from "react"
import { Button, Input } from "@/components/ui"
import { CUSTOMERS } from "@/constants"
import { User, MapPin, Save } from "lucide-react"

export default function CustomerProfilePage() {
  const customer = CUSTOMERS[0]
  const [form, setForm] = useState({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
  })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-brand-900">
          <User size={24} />
          My Profile
        </h1>
        <p className="mt-1 text-sm text-text-secondary">View and update your personal information.</p>
      </div>

      <div className="rounded-xl border border-border-light p-5 shadow-sm">
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave}>
            <Save size={14} />
            {saved ? "Saved!" : "Save Changes"}
          </Button>
          {saved && <span className="text-sm text-brand-900">Profile updated successfully.</span>}
        </div>
      </div>

      <div className="rounded-xl border border-border-light p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-brand-900">
          <MapPin size={18} />
          Delivery Address
        </h2>
        <p className="text-sm text-text-secondary">{customer.address}</p>
        <p className="mt-1 text-xs text-text-secondary">
          Lat: {customer.location.lat.toFixed(4)}, Lng: {customer.location.lng.toFixed(4)}
        </p>
      </div>
    </div>
  )
}
