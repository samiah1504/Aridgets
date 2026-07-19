import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/auth";
import { hasPerm } from "@/lib/permissions";

type Params = Promise<{ id: string }>;

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const caller = await getStaff();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPerm(caller.permissions, "staff.delete")) {
    return NextResponse.json({ error: "You do not have permission to delete staff" }, { status: 403 });
  }
  if (id === caller.userId) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: target } = await service
    .from("profiles")
    .select("full_name, email")
    .eq("id", id)
    .single();

  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    null;

  await service.from("audit_log").insert({
    user_id: caller.userId,
    action: "staff.deleted",
    entity_type: "staff",
    entity_id: id,
    detail: { name: target?.full_name ?? null, email: target?.email ?? null },
    ip,
  });

  return NextResponse.json({ ok: true });
}
