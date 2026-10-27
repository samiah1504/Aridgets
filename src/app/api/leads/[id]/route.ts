import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/auth";
import { hasPerm } from "@/lib/permissions";
import { DROP_STATUSES, LEAD_STATUSES } from "@/lib/leadStatus";
import type { LeadStatus } from "@/types";
import type { Database } from "@/types/database";

type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

type Params = Promise<{ id: string }>;

const VALID_STATUSES = LEAD_STATUSES.map((s) => s.value);

// Status and notes updates. The Meta Purchase event is NOT sent here: it is
// sent only when an order becomes Paid by recording its payment
// (POST /api/leads/[id]/payments). Confirming or delivering never sends it.
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { status?: string; call_notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status: newStatus, call_notes } = body;

  if (!newStatus && call_notes === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (newStatus && !VALID_STATUSES.includes(newStatus as LeadStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Granular permission checks
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (newStatus && !hasPerm(staff.permissions, "leads.change_status")) {
    return NextResponse.json(
      { error: "You do not have permission to change lead status" },
      { status: 403 }
    );
  }
  if (newStatus === "paid" && !hasPerm(staff.permissions, "leads.mark_paid")) {
    return NextResponse.json(
      { error: "You do not have permission to mark orders as paid" },
      { status: 403 }
    );
  }
  if (call_notes !== undefined && !hasPerm(staff.permissions, "leads.edit_notes")) {
    return NextResponse.json(
      { error: "You do not have permission to edit lead notes" },
      { status: 403 }
    );
  }

  // Fetch current lead (RLS: only leads this user can see)
  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select("id, status, confirmed_at, delivered_at, dropped_at, total, amount_paid")
    .eq("id", id)
    .single();

  if (fetchErr || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const fromStatus = lead.status as LeadStatus;

  // Paid means the full amount has been recorded. An order only gets there by
  // recording its payment; setting it back to Paid later (e.g. after a status
  // mistake) is allowed once it is fully paid, and never re-sends Purchase.
  if (newStatus === "paid" && fromStatus !== "paid" && lead.amount_paid < lead.total) {
    return NextResponse.json(
      { error: "Record the customer's payment to mark this order as Paid" },
      { status: 400 }
    );
  }

  // Build update payload
  const update: LeadUpdate = {};

  if (call_notes !== undefined) {
    update.call_notes = call_notes;
  }

  if (newStatus) {
    const s = newStatus as LeadStatus;
    const now = new Date().toISOString();
    update.status = s;
    if (s === "confirmed" && !lead.confirmed_at) update.confirmed_at = now;
    if (s === "delivered" && !lead.delivered_at) update.delivered_at = now;
    // dropped_at records the most recent drop; cleared when the lead re-enters the pipeline
    if (DROP_STATUSES.includes(s)) {
      update.dropped_at = now;
    } else if (lead.dropped_at) {
      update.dropped_at = null;
    }
  }

  // Apply update (the database also enforces the Paid and payment-field rules)
  const { error: updateErr } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // Log status history if status changed
  if (newStatus && newStatus !== fromStatus) {
    await supabase.from("lead_status_history").insert({
      lead_id: id,
      from_status: fromStatus,
      to_status: newStatus,
      changed_by: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
