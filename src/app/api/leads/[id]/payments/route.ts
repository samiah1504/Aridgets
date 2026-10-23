import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/auth";
import { hasPerm } from "@/lib/permissions";
import { deliverPurchaseEvent, type PurchaseDeliveryResult } from "@/lib/purchaseEvent";

type Params = Promise<{ id: string }>;

// Records a payment for an order. The database function record_lead_payment
// does the work atomically (row lock, idempotency key, overpayment check,
// permission check) and marks the order Paid once payments cover the total.
// Only then is the Meta Purchase event sent — with the amount collected.
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPerm(staff.permissions, "leads.mark_paid")) {
    return NextResponse.json({ error: "You do not have permission to record payments" }, { status: 403 });
  }

  let body: { amount?: unknown; note?: unknown; idempotency_key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = body.amount;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter the amount collected in whole naira" }, { status: 400 });
  }
  const key = typeof body.idempotency_key === "string" ? body.idempotency_key.slice(0, 100) : "";
  if (key.length < 8) return NextResponse.json({ error: "Missing request key" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_lead_payment", {
    p_lead_id: id,
    p_amount: amount,
    p_idempotency_key: key,
    p_note: note,
  });
  if (error) {
    // Business-rule messages come from the database function
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const result = data?.[0];
  if (!result) return NextResponse.json({ error: "Payment was not recorded" }, { status: 500 });

  // Send Purchase now when the order is (or, on a repeated request, still is)
  // paid and waiting. The same event ID is reused, so this can never create a
  // second logical Purchase. Awaited: serverless functions stop after responding.
  let purchase: PurchaseDeliveryResult | null = null;
  if (result.status === "paid" && (result.purchase_event_status === "pending" || result.purchase_event_status === "failed")) {
    purchase = await deliverPurchaseEvent(id);
  }

  return NextResponse.json({ ...result, purchase });
}
