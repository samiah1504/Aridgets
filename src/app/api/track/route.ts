import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendCAPIEvent } from "@/lib/capi";
import { SITE_URL } from "@/lib/config";

const EVENT_NAMES = ["PageView", "ViewContent", "Lead", "Contact"] as const;
type BrowserEvent = (typeof EVENT_NAMES)[number];

// Public beacon: landing pages report browser-pixel events so the Tracking
// Center can verify the pixel actually fired without any browser extension.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const productId = typeof b.product_id === "string" ? b.product_id : "";
  const eventName = typeof b.event_name === "string" ? b.event_name : "";

  if (!productId || !EVENT_NAMES.includes(eventName as BrowserEvent)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const service = createServiceClient();

  // Only log events for real, live products (stops junk writes)
  const { data: product } = await service
    .from("products")
    .select("id, status, slug, name, price, pixel_id, capi_access_token, capi_test_event_code")
    .eq("id", productId)
    .single();

  if (!product || product.status !== "live") {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }

  const pixelLoaded = b.pixel_loaded !== false;
  const eventId = typeof b.event_id === "string" ? b.event_id.slice(0, 64) : null;
  const isTest = b.test === true;

  await service.from("tracking_events").insert({
    product_id: productId,
    session_id: typeof b.session_id === "string" ? b.session_id.slice(0, 64) : null,
    event_name: eventName as BrowserEvent,
    event_id: eventId,
    source: "browser",
    status: pixelLoaded ? "sent" : "failed",
    error: pixelLoaded ? null : "Pixel script blocked or failed to load in this browser",
    test: isTest,
  });

  // Mirror PageView/ViewContent server-side via CAPI with the SAME event ID —
  // Meta deduplicates against the browser pixel, and still receives the event
  // when the browser blocked the pixel script. (Lead CAPI is sent by the
  // order API with the lead's own event ID — never duplicated here.)
  if (
    (eventName === "PageView" || eventName === "ViewContent") &&
    eventId &&
    product.pixel_id &&
    product.capi_access_token
  ) {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      null;

    await sendCAPIEvent({
      pixelId: product.pixel_id,
      accessToken: product.capi_access_token,
      testEventCode: product.capi_test_event_code,
      eventName,
      eventId,
      eventTime: Math.floor(Date.now() / 1000),
      sourceUrl: request.headers.get("referer") ?? `${SITE_URL}/p/${product.slug}`,
      clientIp,
      clientUserAgent: request.headers.get("user-agent"),
      fbp: request.cookies.get("_fbp")?.value ?? null,
      fbc: request.cookies.get("_fbc")?.value ?? null,
      ...(eventName === "ViewContent" && {
        currency: "NGN",
        value: product.price,
        contentName: product.name,
      }),
      log: { productId, test: isTest },
    }).catch((err: unknown) => console.error(`CAPI ${eventName}:`, err));
  }

  return NextResponse.json({ ok: true });
}
