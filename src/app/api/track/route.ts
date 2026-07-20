import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

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
    .select("id, status")
    .eq("id", productId)
    .single();

  if (!product || product.status !== "live") {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }

  const pixelLoaded = b.pixel_loaded !== false;

  await service.from("tracking_events").insert({
    product_id: productId,
    session_id: typeof b.session_id === "string" ? b.session_id.slice(0, 64) : null,
    event_name: eventName as BrowserEvent,
    event_id: typeof b.event_id === "string" ? b.event_id.slice(0, 64) : null,
    source: "browser",
    status: pixelLoaded ? "sent" : "failed",
    error: pixelLoaded ? null : "Pixel script blocked or failed to load in this browser",
    test: b.test === true,
  });

  return NextResponse.json({ ok: true });
}
