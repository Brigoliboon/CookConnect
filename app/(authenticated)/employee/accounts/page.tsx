"use client"

import { useState, useMemo } from "react"
import { Button, Input, Select } from "@/components/ui"
import { Table } from "@/components/ui/Table"
import { ACCOUNTS, ROLE_OPTIONS } from "@/constants"
import type { Account, UserRole } from "@/constants"
import { Search, Download, ChevronDown, CheckCircle, XCircle } from "lucide-react"

export default function EmployeeAccountsPage() {
  const [accounts, setAccounts] = useState(ACCOUNTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", role: "customer" as UserRole })
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all")
  const [showRoleDrop, setShowRoleDrop] = useState(false)
  const [showStatusDrop, setShowStatusDrop] = useState(false)

  const filtered = useMemo(
    () =>
      accounts.filter((a) => {
        const matchSearch =
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase())
        const matchRole = roleFilter === "all" || a.role === roleFilter
        const matchStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && a.isActive) ||
          (statusFilter === "disabled" && !a.isActive)
        return matchSearch && matchRole && matchStatus
      }),
    [accounts, search, roleFilter, statusFilter]
  )

  function toggleStatus(id: string) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    )
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Role", "Status", "Created"]
    const rows = filtered.map((a) => [
      a.name,
      a.email,
      a.role,
      a.isActive ? "Active" : "Disabled",
      a.createdAt,
    ])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "accounts.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Accounts</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage all user accounts, filter by role or status, and export data.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportCSV} variant="outline">
            <Download size={16} />
            Export CSV
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Create Account"}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border-light bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Create New Account</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const newAccount: Account = {
                id: String(accounts.length + 1),
                name: form.name,
                email: form.email,
                role: form.role,
                isActive: true,
                createdAt: new Date().toISOString().split("T")[0],
              }
              setAccounts((prev) => [...prev, newAccount])
              setForm({ name: "", email: "", role: "customer" })
              setShowForm(false)
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Full Name"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <Select
                label="Role"
                options={ROLE_OPTIONS}
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Create Account</Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            className="w-full rounded-lg border border-border-light py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowRoleDrop(!showRoleDrop)}
            className="flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-2 text-sm text-text-secondary hover:bg-brand-400/10"
          >
            {roleFilter === "all" ? "All Roles" : roleFilter}
            <ChevronDown size={14} />
          </button>
          {showRoleDrop && (
            <div className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-border-light bg-white shadow-lg z-10">
              {(["all", ...ROLE_OPTIONS.map((r) => r.value)] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => { setRoleFilter(r); setShowRoleDrop(false) }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-brand-400/10 ${
                    roleFilter === r ? "font-semibold text-brand-900" : "text-text-secondary"
                  }`}
                >
                  {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowStatusDrop(!showStatusDrop)}
            className="flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-2 text-sm text-text-secondary hover:bg-brand-400/10"
          >
            {statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active" : "Disabled"}
            <ChevronDown size={14} />
          </button>
          {showStatusDrop && (
            <div className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-border-light bg-white shadow-lg z-10">
              {(["all", "active", "disabled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setShowStatusDrop(false) }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-brand-400/10 ${
                    statusFilter === s ? "font-semibold text-brand-900" : "text-text-secondary"
                  }`}
                >
                  {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Table<Account>
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            {
              key: "role",
              header: "Role",
              render: (row) => (
                <span className="text-sm capitalize">{row.role}</span>
              ),
            },
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
            { key: "createdAt", header: "Created" },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <Button
                  variant={row.isActive ? "danger" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleStatus(row.id)
                  }}
                >
                  {row.isActive ? "Disable" : "Enable"}
                </Button>
              ),
            },
          ]}
          data={filtered}
        />
    </div>
  )
}
