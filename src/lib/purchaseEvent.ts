// Sends the Meta Purchase event for a Paid order, server-side only.
//
// The order row tracks the event: event_id_purchase (one logical event ID,
// reused on every retry so Meta deduplicates), purchase_event_status
// (pending → sent | failed), attempts, last error and sent time.
// "sent" is recorded only after Meta accepts the request.

import { createServiceClient } from "@/lib/supabase/server";
import { sendCAPIEvent } from "@/lib/capi";
import { SITE_URL } from "@/lib/config";

/** In-flight lock per order, released when the attempt finishes (expires if the server dies mid-attempt). */
const ATTEMPT_LOCK_SECONDS = 60;
/** Meta rejects website events older than 7 days. */
const MAX_EVENT_AGE_DAYS = 7;

export type PurchaseDeliveryResult =
  | { status: "sent"; confirmed: boolean; test: boolean }
  | { status: "failed"; error: string }
  | { status: "skipped"; reason: string };

function cleanError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // Never store anything that looks like a credential
  return msg.replace(/access_token=[^&\s"]+/gi, "access_token=[redacted]").slice(0, 500);
}

export async function deliverPurchaseEvent(leadId: string): Promise<PurchaseDeliveryResult> {
  const service = createServiceClient();

  // Claim this attempt atomically (database function): only pending/failed
  // events, and not while another attempt for this order started recently.
  const { data: claimed, error: claimErr } = await service.rpc("claim_purchase_event", {
    p_lead_id: leadId,
    p_lock_seconds: ATTEMPT_LOCK_SECONDS,
  });

  if (claimErr) return { status: "failed", error: cleanError(claimErr.message) };
  const lead = claimed?.[0];
  if (!lead) return { status: "skipped", reason: "Nothing to send (already sent, or another attempt is in progress)" };

  const fail = async (error: string): Promise<PurchaseDeliveryResult> => {
    await service
      .from("leads")
      .update({
        purchase_event_status: "failed",
        purchase_event_error: error,
        purchase_event_locked_until: null,
        purchase_event_attempts: lead.purchase_event_attempts + 1,
      })
      .eq("id", leadId);
    return { status: "failed", error };
  };

  if (lead.status !== "paid" || !lead.event_id_purchase || !lead.purchase_event_value || !lead.paid_at) {
    return fail("Order is not fully paid; Purchase is only sent for paid orders");
  }
  if (!lead.product_id) return fail("The product for this order was deleted, so no Pixel is configured");

  // Tracking configuration of the order's sales page (secret token: service role only)
  const { data: product } = await service
    .from("products")
    .select("name, slug, pixel_id, capi_access_token, capi_test_event_code")
    .eq("id", lead.product_id)
    .single();
  if (!product?.pixel_id || !product.capi_access_token) {
    return fail("This sales page has no Meta Pixel ID and CAPI access token set (Tracking tab)");
  }

  const eventTime = Math.floor(new Date(lead.paid_at).getTime() / 1000);
  if (Date.now() / 1000 - eventTime > MAX_EVENT_AGE_DAYS * 86400) {
    return fail(`Meta only accepts events up to ${MAX_EVENT_AGE_DAYS} days old; this payment was recorded too long ago`);
  }

  const nameParts = (lead.name ?? "").trim().split(/\s+/);
  try {
    const { confirmed } = await sendCAPIEvent({
      pixelId: product.pixel_id,
      accessToken: product.capi_access_token,
      testEventCode: product.capi_test_event_code,
      eventName: "Purchase",
      eventId: lead.event_id_purchase,
      // The time the payment was confirmed; identical on every retry
      eventTime,
      sourceUrl: `${SITE_URL}/p/${product.slug}`,
      phone: lead.phone,
      email: lead.email,
      firstName: nameParts[0] || null,
      lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
      city: lead.city,
      state: lead.state,
      clientIp: lead.client_ip,
      clientUserAgent: lead.client_user_agent,
      fbp: lead.fbp,
      fbc: lead.fbc,
      currency: "NGN",
      value: lead.purchase_event_value,
      contentName: product.name,
      orderId: lead.order_number,
      contentIds: [lead.product_id],
      contents: [{ id: lead.product_id, quantity: lead.quantity, item_price: lead.unit_price }],
      numItems: lead.quantity,
      log: { productId: lead.product_id, leadId: lead.id, test: lead.is_test },
    });
    await service
      .from("leads")
      .update({
        purchase_event_status: "sent",
        purchase_event_sent_at: new Date().toISOString(),
        purchase_event_locked_until: null,
        purchase_event_error: null,
        purchase_event_attempts: lead.purchase_event_attempts + 1,
      })
      .eq("id", leadId);
    return { status: "sent", confirmed, test: !!product.capi_test_event_code };
  } catch (err) {
    return fail(cleanError(err));
  }
}

/** Retries every pending/failed Purchase event (used by the scheduled job). */
export async function retryPendingPurchaseEvents(limit = 50): Promise<{ attempted: number; sent: number; failed: number }> {
  const service = createServiceClient();
  const { data } = await service
    .from("leads")
    .select("id")
    .in("purchase_event_status", ["pending", "failed"])
    .order("paid_at", { ascending: true })
    .limit(limit);
  let sent = 0, failed = 0;
  for (const row of data ?? []) {
    const r = await deliverPurchaseEvent(row.id);
    if (r.status === "sent") sent++;
    else if (r.status === "failed") failed++;
  }
  return { attempted: data?.length ?? 0, sent, failed };
}
