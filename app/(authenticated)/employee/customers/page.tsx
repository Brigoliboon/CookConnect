"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui"
import { Table } from "@/components/ui/Table"
import { Users, CheckCircle, XCircle, Search } from "lucide-react"

interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string
  address: string
  isActive: boolean
  createdAt: string
}

export default function EmployeeCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/customers")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch customers")
        return data as Record<string, unknown>[]
      })
      .then((data) => {
        setCustomers(data.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          email: r.email as string,
          phone: "",
          address: "",
          isActive: r.is_active as boolean,
          createdAt: (r.created_at as string)?.split("T")[0] ?? "",
        })))
      })
      .catch((e) => console.error("[CUSTOMERS] Fetch error:", e.message || e))
      .finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-600 text-white shadow-lg">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Customers</h1>
              <p className="text-sm text-neutral-500">View and manage all registered customers.</p>
            </div>
          </div>
        </div>
        <Link href="/employee/accounts">
          <Button>Add Customer</Button>
        </Link>
      </div>

      <div className="relative w-full sm:w-72">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          className="w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-2.5 pl-10 text-sm text-neutral-900 outline-none backdrop-blur-sm placeholder:text-neutral-400 focus:border-neutral-400"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : (
        <Table<CustomerRow>
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "phone", header: "Phone" },
            { key: "address", header: "Address" },
            {
              key: "isActive",
              header: "Status",
              render: (row) => (
                <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold shadow-sm ${row.isActive ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-600"}`}>
                  {row.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
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
                  className="text-sm font-medium text-neutral-900 underline underline-offset-2 transition-colors hover:text-neutral-600"
                >
                  {row.createdAt}
                </Link>
              ),
            },
          ]}
          data={filtered}
          onRowClick={(row) => window.location.assign(`/employee/customers/${row.id}`)}
        />
      )}
    </div>
  )
}
