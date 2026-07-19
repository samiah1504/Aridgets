"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasPerm } from "@/lib/permissions";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role_id: string | null;
  active: boolean;
  created_at: string;
}

interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
}

interface ProductRow {
  id: string;
  name: string;
}

interface AssignmentRow {
  product_id: string;
  profile_id: string;
}

interface Props {
  currentUserId: string;
  permissions: string[];
  profiles: ProfileRow[];
  roles: RoleRow[];
  products: ProductRow[];
  assignments: AssignmentRow[];
}

export default function StaffManager({
  currentUserId,
  permissions,
  profiles,
  roles,
  products,
  assignments,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = hasPerm(permissions, "staff.create");
  const canEdit = hasPerm(permissions, "staff.edit");
  const canDelete = hasPerm(permissions, "staff.delete");
  const canAssign = hasPerm(permissions, "staff.assign_products");

  const roleById = new Map(roles.map((r) => [r.id, r]));

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: newName,
        email: newEmail,
        password: newPassword,
        role_id: newRoleId || null,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create staff member.");
      return;
    }
    setShowCreate(false);
    setNewName(""); setNewEmail(""); setNewPassword(""); setNewRoleId("");
    router.refresh();
  }

  async function updateProfile(id: string, patch: { role_id?: string | null; active?: boolean }) {
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("profiles").update(patch).eq("id", id);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  async function deleteStaff(id: string, name: string) {
    if (!confirm(`Delete ${name}'s account? This cannot be undone.`)) return;
    setError("");
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete staff member.");
      return;
    }
    router.refresh();
  }

  async function toggleAssignment(profileId: string, productId: string, assigned: boolean) {
    setError("");
    const supabase = createClient();
    if (assigned) {
      const { error: err } = await supabase
        .from("product_assignments")
        .delete()
        .eq("profile_id", profileId)
        .eq("product_id", productId);
      if (err) { setError(err.message); return; }
    } else {
      const { error: err } = await supabase
        .from("product_assignments")
        .insert({ profile_id: profileId, product_id: productId });
      if (err) { setError(err.message); return; }
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Staff</h1>
        {canCreate && (
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-700 transition"
          >
            {showCreate ? "Cancel" : "+ Add Staff"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={createStaff}
          className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Full name</label>
            <input
              type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input
              type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Temporary password <span className="font-normal text-gray-400">(min 8 chars — they can reset it later)</span>
            </label>
            <input
              type="text" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
            <select
              value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
            >
              <option value="">— No role (no access) —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit" disabled={creating}
              className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {profiles.map((p) => {
          const role = p.role_id ? roleById.get(p.role_id) : null;
          const assigned = assignments.filter((a) => a.profile_id === p.id).map((a) => a.product_id);
          const isExpanded = expanded === p.id;
          const isSelf = p.id === currentUserId;

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-gray-900 text-sm">
                    {p.full_name ?? "—"}
                    {isSelf && <span className="ml-2 text-xs text-indigo-500 font-normal">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-400">{p.email ?? "—"}</p>
                </div>

                {canEdit ? (
                  <select
                    value={p.role_id ?? ""}
                    disabled={isSelf}
                    onChange={(e) => updateProfile(p.id, { role_id: e.target.value || null })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none disabled:opacity-50"
                  >
                    <option value="">No role</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                ) : (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-600">
                    {role?.name ?? "No role"}
                  </span>
                )}

                {canEdit && !isSelf && (
                  <button
                    onClick={() => updateProfile(p.id, { active: !p.active })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                      p.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                    title={p.active ? "Click to deactivate" : "Click to activate"}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </button>
                )}

                {canAssign && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                  >
                    Products ({assigned.length}) {isExpanded ? "▴" : "▾"}
                  </button>
                )}

                {canDelete && !isSelf && (
                  <button
                    onClick={() => deleteStaff(p.id, p.full_name ?? p.email ?? "this user")}
                    className="text-xs text-gray-300 hover:text-red-500 transition"
                    title="Delete account"
                  >
                    Delete
                  </button>
                )}
              </div>

              {isExpanded && canAssign && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-2">
                    Assigned products — this member only sees leads for ticked products (when their
                    role has &ldquo;View assigned leads only&rdquo;).
                  </p>
                  {products.length === 0 ? (
                    <p className="text-xs text-gray-400">No products yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                      {products.map((prod) => {
                        const isAssigned = assigned.includes(prod.id);
                        return (
                          <label
                            key={prod.id}
                            className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => toggleAssignment(p.id, prod.id, isAssigned)}
                              className="accent-indigo-600"
                            />
                            <span className="truncate">{prod.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
