import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendCAPIEvent } from "@/lib/capi";
import type { LeadStatus } from "@/types";
import type { Database } from "@/types/database";

type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

type Params = Promise<{ id: string }>;

const VALID_STATUSES: LeadStatus[] = ["new", "buying", "delivery", "paid", "not_buying"];

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

  // Fetch current lead
  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select(
      "id, status, product_id, event_id_purchase, confirmed_at, dispatched_at, paid_at, phone, client_ip, client_user_agent, fbp, fbc, total"
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
    if (s === "buying" && !lead.confirmed_at) {
      update.confirmed_at = new Date().toISOString();
    }
    if (s === "delivery" && !lead.dispatched_at) {
      update.dispatched_at = new Date().toISOString();
    }
    if (s === "paid" && !lead.paid_at) {
      update.paid_at = new Date().toISOString();
    }
    // Generate purchase event ID now (before the update) so we can fire CAPI after
    if (s === "paid" && !lead.event_id_purchase) {
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

  // Fire CAPI Purchase if transitioning to paid for the first time
  if (newStatus === "paid" && !lead.event_id_purchase) {
    const eventIdPurchase = update.event_id_purchase as string;
    const serviceClient = createServiceClient();
    const { data: product } = await serviceClient
      .from("products")
      .select("name, slug, pixel_id, capi_access_token, capi_test_event_code")
      .eq("id", lead.product_id)
      .single();

    if (product?.pixel_id && product?.capi_access_token) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aridgets.vercel.app";
      sendCAPIEvent({
        pixelId: product.pixel_id,
        accessToken: product.capi_access_token,
        testEventCode: product.capi_test_event_code,
        eventName: "Purchase",
        eventId: eventIdPurchase,
        eventTime: Math.floor(Date.now() / 1000),
        sourceUrl: `${siteUrl}/p/${product.slug}`,
        phone: lead.phone,
        clientIp: lead.client_ip,
        clientUserAgent: lead.client_user_agent,
        fbp: lead.fbp,
        fbc: lead.fbc,
        currency: "NGN",
        value: lead.total,
        contentName: product.name,
      }).catch((err) => console.error("CAPI Purchase:", err));
    }
  }

  return NextResponse.json({ ok: true });
}
