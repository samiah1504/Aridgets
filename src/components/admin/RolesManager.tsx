"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PERMISSION_GROUPS } from "@/lib/permissions";

interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function PermissionMatrix({
  selected,
  onToggle,
  disabled,
}: {
  selected: string[];
  onToggle: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.name} className="border border-gray-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {group.name}
          </p>
          <div className="space-y-1">
            {group.permissions.map((perm) => (
              <label
                key={perm.key}
                className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg ${
                  disabled ? "opacity-60" : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.includes("*") || selected.includes(perm.key)}
                  onChange={() => onToggle(perm.key)}
                  className="accent-indigo-600"
                />
                <span className="text-gray-700">{perm.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RolesManager({ roles }: { roles: RoleRow[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>([]);

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("roles").insert({
      key: slugify(newName),
      name: newName.trim(),
      description: newDescription.trim() || null,
      permissions: newPerms,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowCreate(false);
    setNewName(""); setNewDescription(""); setNewPerms([]);
    router.refresh();
  }

  async function togglePermission(role: RoleRow, key: string) {
    setError("");
    const next = role.permissions.includes(key)
      ? role.permissions.filter((p) => p !== key)
      : [...role.permissions, key];
    const supabase = createClient();
    const { error: err } = await supabase
      .from("roles")
      .update({ permissions: next })
      .eq("id", role.id);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  async function deleteRole(role: RoleRow) {
    if (!confirm(`Delete the "${role.name}" role? Staff with this role will lose all access until reassigned.`)) return;
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("roles").delete().eq("id", role.id);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Roles &amp; Permissions</h1>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-700 transition"
        >
          {showCreate ? "Cancel" : "+ Custom Role"}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={createRole} className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Role name</label>
              <input
                type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sales Manager"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
              <input
                type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What is this role for?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          </div>
          <PermissionMatrix
            selected={newPerms}
            onToggle={(key) =>
              setNewPerms((prev) =>
                prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
              )
            }
          />
          <button
            type="submit" disabled={saving}
            className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create role"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {roles.map((role) => {
          const isSuperAdmin = role.key === "super_admin";
          const isOpen = openRole === role.id;
          return (
            <div key={role.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-gray-900 text-sm">
                    {role.name}
                    {role.is_system && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        System
                      </span>
                    )}
                  </p>
                  {role.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{role.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {role.permissions.includes("*")
                    ? "All permissions"
                    : `${role.permissions.length} permission${role.permissions.length === 1 ? "" : "s"}`}
                </span>
                <button
                  onClick={() => setOpenRole(isOpen ? null : role.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                >
                  {isOpen ? "Hide" : isSuperAdmin ? "View" : "Edit"} permissions {isOpen ? "▴" : "▾"}
                </button>
                {!role.is_system && (
                  <button
                    onClick={() => deleteRole(role)}
                    className="text-xs text-gray-300 hover:text-red-500 transition"
                  >
                    Delete
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  {isSuperAdmin && (
                    <p className="text-xs text-gray-400 mb-3">
                      Super Admin always has every permission and cannot be edited.
                    </p>
                  )}
                  <PermissionMatrix
                    selected={role.permissions}
                    onToggle={(key) => togglePermission(role, key)}
                    disabled={isSuperAdmin}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
