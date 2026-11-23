"use client"

import { useState, type ReactNode } from "react"
import useSWR from "swr"
import { Check, Layers, Pencil, Plus, Trash2, X } from "lucide-react"
import { ConfirmDialog } from "@/components/ui"

interface ModifierOption {
  id: string
  group_id: string
  recipe_id: string | null
  recipe_name: string | null
  name: string
  name_ar: string | null
  price_cents: number
  is_default: boolean
  sort_order: number
  is_active: boolean
}

interface ModifierGroup {
  id: string
  name: string
  name_ar: string | null
  sort_order: number
  is_active: boolean
  options: ModifierOption[]
}

interface RecipeOption {
  id: string
  name: string
}

interface GroupDraft {
  id?: string
  name: string
  name_ar: string
  is_active: boolean
}

interface OptionDraft {
  id?: string
  group_id: string
  name: string
  name_ar: string
  price_aed: string
  recipe_id: string
  is_default: boolean
  is_active: boolean
}

function formatAed(cents: number): string {
  const aed = cents / 100
  return Number.isInteger(aed) ? String(aed) : aed.toFixed(2)
}

function emptyGroup(): GroupDraft {
  return { name: "", name_ar: "", is_active: true }
}

function emptyOption(groupId: string): OptionDraft {
  return {
    group_id: groupId,
    name: "",
    name_ar: "",
    price_aed: "0",
    recipe_id: "",
    is_default: false,
    is_active: true,
  }
}

function optionToDraft(option: ModifierOption): OptionDraft {
  return {
    id: option.id,
    group_id: option.group_id,
    name: option.name,
    name_ar: option.name_ar ?? "",
    price_aed: formatAed(option.price_cents),
    recipe_id: option.recipe_id ?? "",
    is_default: option.is_default,
    is_active: option.is_active,
  }
}

async function readError(res: Response): Promise<string> {
  const payload = await res.json().catch(() => ({}))
  return (payload as { error?: string }).error ?? `Request failed (${res.status})`
}

async function fetchModifierGroups(url: string): Promise<ModifierGroup[]> {
  const res = await fetch(url)
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((payload as { error?: string }).error ?? "Failed to load groups")
  return (payload as { data?: ModifierGroup[] }).data ?? []
}

async function fetchRecipeOptions(url: string): Promise<RecipeOption[]> {
  const res = await fetch(url)
  const payload = await res.json()
  const rows: Record<string, unknown>[] = Array.isArray(payload) ? payload : (payload.data ?? [])
  return rows.map((row) => ({ id: row.id as string, name: row.name as string }))
}

export function ModifierGroupsBoard() {
  const { data, error: loadError, isLoading: loading, mutate: refresh } = useSWR(
    "/api/meal-modifiers/groups",
    fetchModifierGroups,
    { revalidateOnFocus: true },
  )
  const { data: recipes = [] } = useSWR("/api/recipe?sort=name&limit=100", fetchRecipeOptions)
  const groups = data ?? []
  const [formError, setFormError] = useState<string | null>(null)
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null)
  const [optionDraft, setOptionDraft] = useState<OptionDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "group"; id: string; name: string }
    | { type: "option"; id: string; name: string }
    | null
  >(null)

  async function saveGroup() {
    if (!groupDraft || !groupDraft.name.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      const body = {
        name: groupDraft.name,
        name_ar: groupDraft.name_ar,
        is_active: groupDraft.is_active,
      }
      const res = await fetch(
        groupDraft.id ? `/api/meal-modifiers/groups/${groupDraft.id}` : "/api/meal-modifiers/groups",
        {
          method: groupDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) throw new Error(await readError(res))
      setGroupDraft(null)
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save group")
    } finally {
      setSaving(false)
    }
  }

  async function saveOption() {
    if (!optionDraft || !optionDraft.name.trim()) return
    const aed = Number(optionDraft.price_aed)
    if (!Number.isFinite(aed) || aed < 0) {
      setFormError("Add-on price must be zero or greater, in AED.")
      return
    }
    const price_cents = Math.round(aed * 100)
    setSaving(true)
    setFormError(null)
    try {
      const body = {
        group_id: optionDraft.group_id,
        name: optionDraft.name,
        name_ar: optionDraft.name_ar,
        price_cents,
        recipe_id: optionDraft.recipe_id || null,
        is_default: optionDraft.is_default,
        is_active: optionDraft.is_active,
      }
      const res = await fetch(
        optionDraft.id ? `/api/meal-modifiers/options/${optionDraft.id}` : "/api/meal-modifiers/options",
        {
          method: optionDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) throw new Error(await readError(res))
      setOptionDraft(null)
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save option")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    setFormError(null)
    try {
      const path =
        deleteTarget.type === "group"
          ? `/api/meal-modifiers/groups/${deleteTarget.id}`
          : `/api/meal-modifiers/options/${deleteTarget.id}`
      const res = await fetch(path, { method: "DELETE" })
      if (!res.ok) throw new Error(await readError(res))
      if (optionDraft?.id === deleteTarget.id) setOptionDraft(null)
      if (groupDraft?.id === deleteTarget.id) setGroupDraft(null)
      setDeleteTarget(null)
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[#0F172A] md:text-2xl">
            <Layers size={22} className="text-[#475569]" />
            Modifier groups
          </h1>
          <p className="mt-2 text-sm text-[#475569] md:text-base">
            Reusable pick-one choices such as sides or spice level. Attach them to meals in the meal form.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOptionDraft(null)
            setGroupDraft(emptyGroup())
          }}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-5 text-base font-semibold text-white transition-colors hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New group</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {(loadError || formError) && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError ?? (loadError instanceof Error ? loadError.message : "Failed to load groups")}
        </p>
      )}

      {groupDraft && !groupDraft.id && (
        <div className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <GroupForm
            draft={groupDraft}
            saving={saving}
            onChange={setGroupDraft}
            onCancel={() => setGroupDraft(null)}
            onSave={() => { void saveGroup() }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#475569]">Loading groups...</p>
      ) : groups.length === 0 && !groupDraft ? (
        <p className="rounded-2xl border border-dashed border-[#E2E8F0] px-4 py-10 text-center text-sm text-[#475569]">
          No modifier groups yet. Create one for sides, spice level, or any other required choice.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <section key={group.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              {groupDraft?.id === group.id ? (
                <GroupForm
                  draft={groupDraft}
                  saving={saving}
                  onChange={setGroupDraft}
                  onCancel={() => setGroupDraft(null)}
                  onSave={() => { void saveGroup() }}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[#0F172A]">
                      {group.name}
                      {!group.is_active && (
                        <span className="ml-2 text-xs font-medium text-[#94A3B8]">Inactive</span>
                      )}
                    </h2>
                    {group.name_ar && (
                      <p className="mt-0.5 text-sm text-[#475569]" dir="auto">{group.name_ar}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      label="Edit group"
                      onClick={() => {
                        setOptionDraft(null)
                        setGroupDraft({
                          id: group.id,
                          name: group.name,
                          name_ar: group.name_ar ?? "",
                          is_active: group.is_active,
                        })
                      }}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      label="Delete group"
                      onClick={() => setDeleteTarget({ type: "group", id: group.id, name: group.name })}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              )}

              <ul className="mt-3 divide-y divide-[#F1F5F9]">
                {group.options.map((option) => (
                  <li key={option.id} className="py-2">
                    {optionDraft?.id === option.id ? (
                      <OptionForm
                        draft={optionDraft}
                        recipes={recipes}
                        saving={saving}
                        onChange={setOptionDraft}
                        onCancel={() => setOptionDraft(null)}
                        onSave={() => { void saveOption() }}
                      />
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1E293B]">
                            {option.name}
                            {option.is_default && (
                              <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-[#15803D]">
                                Default
                              </span>
                            )}
                            {!option.is_active && (
                              <span className="ml-2 text-[11px] font-medium text-[#94A3B8]">Inactive</span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-[#475569]">
                            {option.price_cents === 0 ? "Free" : `AED ${formatAed(option.price_cents)}`}
                            {option.recipe_name ? ` · ${option.recipe_name}` : ""}
                            {option.name_ar ? ` · ${option.name_ar}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <IconButton
                            label="Edit option"
                            onClick={() => {
                              setGroupDraft(null)
                              setOptionDraft(optionToDraft(option))
                            }}
                          >
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton
                            label="Delete option"
                            onClick={() => setDeleteTarget({ type: "option", id: option.id, name: option.name })}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {optionDraft && !optionDraft.id && optionDraft.group_id === group.id ? (
                <div className="mt-3 border-t border-[#F1F5F9] pt-3">
                  <OptionForm
                    draft={optionDraft}
                    recipes={recipes}
                    saving={saving}
                    onChange={setOptionDraft}
                    onCancel={() => setOptionDraft(null)}
                    onSave={() => { void saveOption() }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setGroupDraft(null)
                    setOptionDraft(emptyOption(group.id))
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#15803D] hover:underline"
                >
                  <Plus size={14} />
                  Add option
                </button>
              )}
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { void confirmDelete() }}
        title={deleteTarget?.type === "group" ? "Delete group?" : "Delete option?"}
        message={
          deleteTarget?.type === "group"
            ? `Delete “${deleteTarget.name}”? This removes the group, its options, and detaches it from every meal.`
            : `Delete “${deleteTarget?.name ?? ""}”? Orders that already used this option keep their saved name and price.`
        }
      />
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-lg text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
    >
      {children}
    </button>
  )
}

function GroupForm({
  draft,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: GroupDraft
  saving: boolean
  onChange: (draft: GroupDraft) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <Field label="Name">
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          required
          className={inputClass}
          placeholder="Choose your side"
        />
      </Field>
      <Field label="Arabic name">
        <input
          value={draft.name_ar}
          onChange={(e) => onChange({ ...draft, name_ar: e.target.value })}
          dir="auto"
          className={inputClass}
          placeholder="Optional"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-[#1E293B]">
        <input
          type="checkbox"
          checked={draft.is_active}
          onChange={(e) => onChange({ ...draft, is_active: e.target.checked })}
          className="size-4 accent-neutral-900"
        />
        Active
      </label>
      <FormActions saving={saving} disabled={!draft.name.trim()} onCancel={onCancel} />
    </form>
  )
}

function OptionForm({
  draft,
  recipes,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: OptionDraft
  recipes: RecipeOption[]
  saving: boolean
  onChange: (draft: OptionDraft) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <Field label="Name">
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          required
          className={inputClass}
          placeholder="Spicy"
        />
      </Field>
      <Field label="Arabic name">
        <input
          value={draft.name_ar}
          onChange={(e) => onChange({ ...draft, name_ar: e.target.value })}
          dir="auto"
          className={inputClass}
          placeholder="Optional"
        />
      </Field>
      <Field label="Add-on price (AED)">
        <input
          type="number"
          min={0}
          step="0.01"
          value={draft.price_aed}
          onChange={(e) => onChange({ ...draft, price_aed: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Side recipe (optional)">
        <select
          value={draft.recipe_id}
          onChange={(e) => onChange({ ...draft, recipe_id: e.target.value })}
          className={inputClass}
        >
          <option value="">None — not a side, just a choice</option>
          {draft.recipe_id && !recipes.some((recipe) => recipe.id === draft.recipe_id) && (
            <option value={draft.recipe_id}>Current recipe</option>
          )}
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-[#1E293B]">
          <input
            type="checkbox"
            checked={draft.is_default}
            onChange={(e) => onChange({ ...draft, is_default: e.target.checked })}
            className="size-4 accent-neutral-900"
          />
          Default
        </label>
        <label className="flex items-center gap-2 text-sm text-[#1E293B]">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => onChange({ ...draft, is_active: e.target.checked })}
            className="size-4 accent-neutral-900"
          />
          Active
        </label>
      </div>
      <FormActions saving={saving} disabled={!draft.name.trim()} onCancel={onCancel} />
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#334155]">{label}</span>
      {children}
    </label>
  )
}

function FormActions({
  saving,
  disabled,
  onCancel,
}: {
  saving: boolean
  disabled: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="submit"
        disabled={saving || disabled}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#15803D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166534] disabled:opacity-50"
      >
        <Check size={16} />
        {saving ? "Saving..." : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-[#475569] hover:bg-[#F1F5F9]"
      >
        <X size={16} />
        Cancel
      </button>
    </div>
  )
}

const inputClass =
  "h-11 w-full rounded-xl border border-[#64748B] bg-white px-3 text-sm text-[#1E293B] outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[#15803D]"
