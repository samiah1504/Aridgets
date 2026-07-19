import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/auth";
import { hasPerm } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const caller = await getStaff();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPerm(caller.permissions, "staff.create")) {
    return NextResponse.json({ error: "You do not have permission to create staff" }, { status: 403 });
  }

  let body: { email?: string; password?: string; full_name?: string; role_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const fullName = body.full_name?.trim() ?? "";
  const roleId = body.role_id ?? null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Failed to create user" },
      { status: 400 }
    );
  }

  // The auth trigger creates the profile; set role + name explicitly
  const { error: profileErr } = await service
    .from("profiles")
    .upsert({
      id: created.user.id,
      full_name: fullName,
      email,
      role_id: roleId,
      active: true,
    });

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    null;

  await service.from("audit_log").insert({
    user_id: caller.userId,
    action: "staff.created",
    entity_type: "staff",
    entity_id: created.user.id,
    detail: { name: fullName, email },
    ip,
  });

  return NextResponse.json({ ok: true, id: created.user.id });
}
