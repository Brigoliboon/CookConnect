"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui"
import { Table } from "@/components/ui/Table"
import { CUSTOMERS } from "@/constants"
import type { Customer } from "@/constants"
import { Users, CheckCircle, XCircle, Search } from "lucide-react"

export default function EmployeeCustomersPage() {
  const [search, setSearch] = useState("")

  const filtered = CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-brand-900">
            <Users size={24} />
            Customers
          </h1>
          <p className="mt-1 text-sm text-text-secondary">View and manage all registered customers.</p>
        </div>
        <Link href="/employee/accounts">
          <Button>Add Customer</Button>
        </Link>
      </div>

      <div className="relative w-full sm:w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          className="w-full rounded-lg border border-border-light py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-400"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table<Customer>
        columns={[
          { key: "name", header: "Name" },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone" },
          { key: "address", header: "Address" },
          {
            key: "isActive",
            header: "Status",
            render: (row) => (
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${row.isActive ? "text-brand-900" : "text-red-500"}`}>
                {row.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {row.isActive ? "Active" : "Disabled"}
              </span>
            ),
          },
          {
            key: "createdAt",
            header: "Created",
            render: (row) => (
              <Link
                href={`/employee/customers/${row.id}`}
                className="text-brand-700 underline hover:text-brand-900"
              >
                {row.createdAt}
              </Link>
            ),
          },
        ]}
        data={filtered}
        onRowClick={(row) => window.location.assign(`/employee/customers/${row.id}`)}
      />
    </div>
  )
}
