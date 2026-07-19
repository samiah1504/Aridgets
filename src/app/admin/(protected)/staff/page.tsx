import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePerm } from "@/lib/auth";
import StaffManager from "@/components/admin/StaffManager";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const staff = await requirePerm("staff.view");
  const supabase = await createClient();

  const [{ data: profiles }, { data: roles }, { data: products }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role_id, active, created_at")
        .order("created_at"),
      supabase.from("roles").select("id, key, name, description, is_system, permissions").order("created_at"),
      supabase.from("products").select("id, name").order("name"),
      supabase.from("product_assignments").select("product_id, profile_id"),
    ]);

  return (
    <StaffManager
      currentUserId={staff.userId}
      permissions={staff.permissions}
      profiles={profiles ?? []}
      roles={roles ?? []}
      products={products ?? []}
      assignments={assignments ?? []}
    />
  );
}
