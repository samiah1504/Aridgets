import { createHash } from "crypto";

const API_VERSION = process.env.META_GRAPH_API_VERSION ?? "v21.0";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface CAPIEventPayload {
  pixelId: string;
  accessToken: string;
  testEventCode?: string | null;
  eventName: "Lead" | "Purchase";
  eventId: string;
  eventTime: number;
  sourceUrl: string;
  phone?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  currency: string;
  value: number;
  contentName?: string;
}

export async function sendCAPIEvent(payload: CAPIEventPayload): Promise<void> {
  const url = `https://graph.facebook.com/${API_VERSION}/${payload.pixelId}/events`;

  const userData: Record<string, unknown> = {};
  if (payload.phone) userData.ph = [sha256(payload.phone)];
  if (payload.clientIp) userData.client_ip_address = payload.clientIp;
  if (payload.clientUserAgent) userData.client_user_agent = payload.clientUserAgent;
  if (payload.fbp) userData.fbp = payload.fbp;
  if (payload.fbc) userData.fbc = payload.fbc;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: payload.eventName,
        event_time: payload.eventTime,
        event_id: payload.eventId,
        action_source: "website",
        event_source_url: payload.sourceUrl,
        user_data: userData,
        custom_data: {
          currency: payload.currency,
          value: payload.value,
          content_type: "product",
          ...(payload.contentName && { content_name: payload.contentName }),
        },
      },
    ],
    access_token: payload.accessToken,
  };

  if (payload.testEventCode) {
    body.test_event_code = payload.testEventCode;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CAPI ${payload.eventName} failed (${res.status}): ${text}`);
  }
}
