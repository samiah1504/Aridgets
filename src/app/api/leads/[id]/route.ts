import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/auth";
import { hasPerm } from "@/lib/permissions";
import { sendCAPIEvent } from "@/lib/capi";
import type { LeadStatus } from "@/types";
import type { Database } from "@/types/database";

type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

type Params = Promise<{ id: string }>;

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "confirmed",
  "not_buying",
  "cancelled",
  "not_picking_calls",
];

const DROP_STATUSES: LeadStatus[] = ["not_buying", "cancelled", "not_picking_calls"];

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
  if (call_notes !== undefined && !hasPerm(staff.permissions, "leads.edit_notes")) {
    return NextResponse.json(
      { error: "You do not have permission to edit lead notes" },
      { status: 403 }
    );
  }

  // Fetch current lead
  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select(
      "id, status, product_id, event_id_purchase, confirmed_at, dropped_at, phone, email, name, city, state, is_test, client_ip, client_user_agent, fbp, fbc, total"
    )
    .eq("id", id)
    .single();

  if (fetchErr || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const fromStatus = lead.status as LeadStatus;

  // Build update payload
  const update: LeadUpdate = {};

  if (call_notes !== undefined) {
    update.call_notes = call_notes;
  }

  if (newStatus) {
    const s = newStatus as LeadStatus;
    update.status = s;
    if (s === "confirmed" && !lead.confirmed_at) {
      update.confirmed_at = new Date().toISOString();
    }
    // dropped_at records the most recent drop; cleared when the lead re-enters the pipeline
    if (DROP_STATUSES.includes(s)) {
      update.dropped_at = new Date().toISOString();
    } else if (lead.dropped_at) {
      update.dropped_at = null;
    }
    // Generate purchase event ID now (before the update) so we can fire CAPI after
    if (s === "confirmed" && !lead.event_id_purchase) {
      update.event_id_purchase = crypto.randomUUID();
    }
  }

  // Apply update
  const { error: updateErr } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
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

  // Fire CAPI Purchase if transitioning to confirmed for the first time
  if (newStatus === "confirmed" && !lead.event_id_purchase) {
    const eventIdPurchase = update.event_id_purchase as string;
    const serviceClient = createServiceClient();
    const { data: product } = await serviceClient
      .from("products")
      .select("name, slug, pixel_id, capi_access_token, capi_test_event_code")
      .eq("id", lead.product_id)
      .single();

    if (product?.pixel_id && product?.capi_access_token) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aridgets.vercel.app";
      const nameParts = (lead.name ?? "").split(/\s+/);
      sendCAPIEvent({
        pixelId: product.pixel_id,
        accessToken: product.capi_access_token,
        testEventCode: product.capi_test_event_code,
        eventName: "Purchase",
        eventId: eventIdPurchase,
        eventTime: Math.floor(Date.now() / 1000),
        sourceUrl: `${siteUrl}/p/${product.slug}`,
        phone: lead.phone,
        email: lead.email,
        firstName: nameParts[0] ?? null,
        lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
        city: lead.city,
        state: lead.state,
        clientIp: lead.client_ip,
        clientUserAgent: lead.client_user_agent,
        fbp: lead.fbp,
        fbc: lead.fbc,
        currency: "NGN",
        value: lead.total,
        contentName: product.name,
        log: { productId: lead.product_id, leadId: lead.id, test: lead.is_test },
      }).catch((err) => console.error("CAPI Purchase:", err));
    }
  }

  return NextResponse.json({ ok: true });
}
