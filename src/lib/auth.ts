import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPerm, hasAnyPerm } from "@/lib/permissions";
import type { Role } from "@/types";

export interface Staff {
  userId: string;
  email: string;
  fullName: string | null;
  active: boolean;
  role: Pick<Role, "id" | "key" | "name" | "permissions"> | null;
  permissions: string[];
}

// Cached per-request: layout and pages can all call this without extra queries.
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, active, roles(id, key, name, permissions)")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const role = (profile.roles as Staff["role"]) ?? null;

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    active: profile.active,
    role,
    permissions: profile.active ? (role?.permissions ?? []) : [],
  };
});

/** Redirects to login when unauthenticated, to /admin when lacking permission. */
export async function requirePerm(keys: string | string[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  const list = Array.isArray(keys) ? keys : [keys];
  if (!hasAnyPerm(staff.permissions, list)) redirect("/admin");
  return staff;
}

export { hasPerm, hasAnyPerm };
