import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

const API_VERSION = process.env.META_GRAPH_API_VERSION ?? "v21.0";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface CAPIEventPayload {
  pixelId: string;
  accessToken: string;
  testEventCode?: string | null;
  eventName: "PageView" | "ViewContent" | "Lead" | "Purchase";
  eventId: string;
  eventTime: number;
  sourceUrl: string;
  phone?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  currency?: string;
  value?: number;
  contentName?: string;
  /** When provided, the send result is recorded in tracking_events */
  log?: { productId: string; leadId?: string | null; test?: boolean };
}

async function logEvent(
  payload: CAPIEventPayload,
  status: "sent" | "confirmed" | "failed",
  error: string | null
): Promise<void> {
  if (!payload.log) return;
  try {
    const service = createServiceClient();
    await service.from("tracking_events").insert({
      product_id: payload.log.productId,
      lead_id: payload.log.leadId ?? null,
      event_name: payload.eventName,
      event_id: payload.eventId,
      source: "server",
      status,
      error: error ? error.slice(0, 500) : null,
      test: payload.log.test ?? !!payload.testEventCode,
    });
  } catch (err) {
    console.error("tracking_events log:", err);
  }
}

export async function sendCAPIEvent(payload: CAPIEventPayload): Promise<void> {
  const url = `https://graph.facebook.com/${API_VERSION}/${payload.pixelId}/events`;

  const userData: Record<string, unknown> = {};
  if (payload.phone) userData.ph = [sha256(payload.phone)];
  if (payload.email) userData.em = [sha256(payload.email)];
  if (payload.firstName) userData.fn = [sha256(payload.firstName)];
  if (payload.lastName) userData.ln = [sha256(payload.lastName)];
  if (payload.city) userData.ct = [sha256(payload.city.replace(/[^a-zA-Z]/g, ""))];
  if (payload.state) userData.st = [sha256(payload.state.replace(/[^a-zA-Z]/g, ""))];
  if (payload.clientIp) userData.client_ip_address = payload.clientIp;
  if (payload.clientUserAgent) userData.client_user_agent = payload.clientUserAgent;
  if (payload.fbp) userData.fbp = payload.fbp;
  if (payload.fbc) userData.fbc = payload.fbc;

  const customData: Record<string, unknown> = {};
  if (payload.currency) customData.currency = payload.currency;
  if (payload.value !== undefined) customData.value = payload.value;
  if (payload.contentName) {
    customData.content_type = "product";
    customData.content_name = payload.contentName;
  }

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: payload.eventName,
        event_time: payload.eventTime,
        event_id: payload.eventId,
        action_source: "website",
        event_source_url: payload.sourceUrl,
        user_data: userData,
        ...(Object.keys(customData).length > 0 && { custom_data: customData }),
      },
    ],
    access_token: payload.accessToken,
  };

  if (payload.testEventCode) {
    body.test_event_code = payload.testEventCode;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    await logEvent(payload, "failed", msg);
    throw new Error(`CAPI ${payload.eventName} network error: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text();
    await logEvent(payload, "failed", `HTTP ${res.status}: ${text}`);
    throw new Error(`CAPI ${payload.eventName} failed (${res.status}): ${text}`);
  }

  // Meta acknowledges receipt with events_received
  let confirmed = false;
  try {
    const json = (await res.json()) as { events_received?: number };
    confirmed = (json.events_received ?? 0) >= 1;
  } catch {
    confirmed = false;
  }
  await logEvent(payload, confirmed ? "confirmed" : "sent", null);
}
