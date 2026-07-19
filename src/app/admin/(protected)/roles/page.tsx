import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePerm } from "@/lib/auth";
import RolesManager from "@/components/admin/RolesManager";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  await requirePerm("roles.manage");
  const supabase = await createClient();

  const { data: roles } = await supabase
    .from("roles")
    .select("id, key, name, description, is_system, permissions")
    .order("created_at");

  return <RolesManager roles={roles ?? []} />;
}
