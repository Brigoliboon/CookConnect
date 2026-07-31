"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Download, Plus, X, Check, ChevronDown, Mail, Shield, Calendar, MoreVertical, UserPlus } from "lucide-react"
import type { UserRole } from "@/constants"
import { ROLE_OPTIONS } from "@/constants"

interface AccountRow {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

const roleColors: Record<string, string> = {
  admin: "from-brand-900 to-brand-400",
  employee: "from-brand-900/80 to-brand-400/80",
  customer: "from-brand-400 to-brand-700",
  rider: "from-brand-900/60 to-brand-700/60",
}

const roleBadge: Record<string, string> = {
  admin: "bg-brand-900/10 text-brand-900",
  employee: "bg-brand-900/10 text-brand-900",
  customer: "bg-brand-400/20 text-brand-900",
  rider: "bg-brand-900/10 text-brand-900",
}

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${roleColors[role] ?? "from-neutral-500 to-neutral-600"} text-sm font-bold text-white shadow-sm`}>
      {initials}
    </div>
  )
}

export default function EmployeeAccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all")
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", role: "customer" as UserRole })
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/accounts")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch accounts")
        return data as Record<string, unknown>[]
      })
      .then((data) => {
        setAccounts(data.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          email: r.email as string,
          role: r.role as UserRole,
          isActive: r.is_active as boolean,
          createdAt: (r.created_at as string)?.split("T")[0] ?? "",
        })))
      })
      .catch((e) => console.error("[ACCOUNTS] Fetch error:", e.message || e))
      .finally(() => setLoading(false))
  }, [])

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

  async function toggleStatus(id: string) {
    if (toggling) return
    setToggling(id)
    try {
      const account = accounts.find((a) => a.id === id)
      if (!account) return
      const desired = !account.isActive
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: desired }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error("[ACCOUNTS] Toggle failed:", err.error)
        return
      }
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: desired } : a))
      )
    } catch (e) {
      console.error("[ACCOUNTS] Toggle error:", e)
    } finally {
      setToggling(null)
    }
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Role", "Status", "Created"]
    const rows = filtered.map((a) => [a.name, a.email, a.role, a.isActive ? "Active" : "Disabled", a.createdAt])
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 px-6 py-10">
      <div>
        <div className="mb-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-900 to-brand-400 text-white shadow-lg">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Accounts</h1>
              <p className="text-sm text-neutral-500">Manage your team and customer accounts</p>
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accounts..."
              className="w-full rounded-2xl border border-neutral-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-neutral-900 backdrop-blur-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm font-medium text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 hover:bg-white"
            >
              <ChevronDown size={15} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
              Filters
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm font-medium text-neutral-600 backdrop-blur-sm transition-all hover:border-neutral-400 hover:bg-white"
            >
              <Download size={15} />
              Export
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800"
            >
              <Plus size={16} />
              Add Account
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 rounded-2xl border border-neutral-200 bg-white/60 p-4 backdrop-blur-sm">
                <div className="flex flex-wrap gap-2">
                  {(["all", ...ROLE_OPTIONS.map((r) => r.value)] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                        roleFilter === r
                          ? "bg-neutral-900 text-white shadow-sm"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {(["all", "active", "disabled"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                        statusFilter === s
                          ? "bg-neutral-900 text-white shadow-sm"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-24">
            <UserPlus size={48} className="mb-4 text-neutral-300" />
            <p className="text-lg font-medium text-neutral-500">No accounts found</p>
            <p className="mt-1 text-sm text-neutral-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((account, i) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50"
              >
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-neutral-100 to-transparent opacity-50" />
                <div className="p-5">
                    <div className="flex items-start justify-between">
                      <Avatar name={account.name} role={account.role} />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(account.id) }}
                        disabled={toggling === account.id}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          account.isActive
                            ? "bg-green-600 text-white shadow-sm hover:bg-green-700"
                            : "bg-red-600 text-white shadow-sm hover:bg-red-700"
                        }`}
                      >
                        {toggling === account.id ? (
                          <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : account.isActive ? (
                          <Check size={13} />
                        ) : (
                          <X size={13} />
                        )}
                        {toggling === account.id ? "Updating..." : account.isActive ? "Active" : "Disabled"}
                      </button>
                    </div>
                  <div className="mt-4">
                    <h3 className="font-semibold text-neutral-900">{account.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
                      <Mail size={12} />
                      {account.email}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${roleBadge[account.role] ?? "bg-neutral-100 text-neutral-600"}`}>
                      <Shield size={10} />
                      {account.role}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-neutral-400">
                      <Calendar size={11} />
                      {account.createdAt}
                    </span>
                  </div>
                </div>
                <div className={`h-1 w-full transition-all ${
                  account.isActive ? "bg-brand-900" : "bg-neutral-200"
                }`} />
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-neutral-400">
          <span>{filtered.length} of {accounts.length} accounts</span>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-900 to-emerald-700 text-white shadow-sm">
                    <UserPlus size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-neutral-900">New Account</h2>
                </div>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 transition-colors hover:text-neutral-700">
                  <X size={20} />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    const res = await fetch("/api/accounts", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    })
                    if (!res.ok) {
                      const err = await res.json()
                      console.error("[ACCOUNTS] Create failed:", err.error)
                      return
                    }
                    const created = await res.json()
                    const user = created.id ? created : created.user ?? created
                    setAccounts((prev) => [{
                      id: user.id,
                      name: form.name,
                      email: user.email ?? form.email,
                      role: form.role,
                      isActive: true,
                      createdAt: user.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0],
                    }, ...prev])
                    setForm({ name: "", email: "", role: "customer" })
                    setShowForm(false)
                  } catch (e) {
                    console.error("[ACCOUNTS] Create error:", e)
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Full Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition-all hover:bg-neutral-800"
                >
                  Create Account
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}