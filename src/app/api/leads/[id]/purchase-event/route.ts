import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/auth";
import { hasPerm } from "@/lib/permissions";
import { deliverPurchaseEvent } from "@/lib/purchaseEvent";

type Params = Promise<{ id: string }>;

// Retry a pending or failed Purchase event. Reuses the order's event ID, so
// Meta treats every attempt as the same purchase.
export async function POST(_request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPerm(staff.permissions, "leads.mark_paid")) {
    return NextResponse.json({ error: "You do not have permission to send Purchase events" }, { status: 403 });
  }

  // The caller must be able to see this order (RLS)
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("id").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const result = await deliverPurchaseEvent(id);
  return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
}
