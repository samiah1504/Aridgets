import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isValidNGPhone, normaliseNGPhone } from "@/lib/utils/phone";
import { sendCAPIEvent } from "@/lib/capi";
import { sendPushToAll } from "@/lib/push";
import type { Database } from "@/types/database";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const productId = typeof b.product_id === "string" ? b.product_id : "";
  const rawName = typeof b.name === "string" ? b.name.trim() : "";
  const rawPhone = typeof b.phone === "string" ? b.phone.trim() : "";
  const rawState = typeof b.state === "string" ? b.state.trim() : "";
  const rawAddress = typeof b.address === "string" ? b.address.trim() : "";
  const rawCity = typeof b.city === "string" ? b.city.trim() : null;
  const quantity = Math.max(1, Math.round(Number(b.quantity ?? 1)));

  if (!productId) return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  if (!rawName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!rawPhone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  if (!isValidNGPhone(rawPhone)) {
    return NextResponse.json({ error: "Enter a valid Nigerian phone number" }, { status: 400 });
  }
  if (!rawState) return NextResponse.json({ error: "State is required" }, { status: 400 });
  if (!rawAddress) return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });

  const variantId = typeof b.variant_id === "string" && b.variant_id ? b.variant_id : null;
  const rawSelectedOptions =
    b.selected_options &&
    typeof b.selected_options === "object" &&
    !Array.isArray(b.selected_options)
      ? (b.selected_options as Record<string, string>)
      : null;

  const supabase = await createClient();

  // Fetch product price (anon can read live products via RLS)
  const { data: rawProduct, error: productError } = await supabase
    .from("products")
    .select("id, price, status, content")
    .eq("id", productId)
    .single();

  if (productError || !rawProduct) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const product = rawProduct as {
    id: string;
    price: number;
    status: string;
    content: { seriousBuyer?: { enabled?: boolean; required?: boolean } } | null;
  };
  if (product.status !== "live") {
    return NextResponse.json({ error: "Product not available" }, { status: 404 });
  }

  // Serious Buyers notice: enforce confirmation server-side when required
  const notice = product.content?.seriousBuyer;
  const buyerConfirmed = b.buyer_confirmed === true;
  if (notice?.enabled !== false && notice?.required !== false && !buyerConfirmed) {
    return NextResponse.json(
      { error: "Please confirm that you are ready to receive and pay on delivery" },
      { status: 400 }
    );
  }

  let unitPrice = product.price;

  // If a variant was selected, use its price_override (server-side validation)
  if (variantId) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("price_override, active")
      .eq("id", variantId)
      .eq("product_id", productId)
      .single();
    if (variant?.active && variant.price_override !== null && variant.price_override !== undefined) {
      unitPrice = variant.price_override as number;
    }
  }

  const total = unitPrice * quantity;

  const headerStore = await headers();
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const clientUserAgent = headerStore.get("user-agent") ?? null;

  const insertPayload: LeadInsert = {
    product_id: productId,
    name: rawName,
    phone: normaliseNGPhone(rawPhone),
    state: rawState,
    city: rawCity || null,
    address: rawAddress,
    buyer_confirmed: buyerConfirmed,
    quantity,
    unit_price: unitPrice,
    total,
    fbp: typeof b.fbp === "string" ? b.fbp : null,
    fbc: typeof b.fbc === "string" ? b.fbc : null,
    fbclid: typeof b.fbclid === "string" ? b.fbclid : null,
    utm_source: typeof b.utm_source === "string" ? b.utm_source : null,
    utm_medium: typeof b.utm_medium === "string" ? b.utm_medium : null,
    utm_campaign: typeof b.utm_campaign === "string" ? b.utm_campaign : null,
    utm_content: typeof b.utm_content === "string" ? b.utm_content : null,
    client_ip: clientIp,
    client_user_agent: clientUserAgent,
    variant_id: variantId || undefined,
    selected_options: rawSelectedOptions || undefined,
    is_test: b.is_test === true,
    tracking_session_id:
      typeof b.session_id === "string" ? b.session_id.slice(0, 64) : null,
  };

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert(insertPayload)
    .select("id, order_number, total, name, event_id_lead")
    .single();

  if (insertError || !lead) {
    console.error("Lead insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }

  const result = lead as {
    id: string;
    order_number: string;
    total: number;
    name: string;
    event_id_lead: string;
  };

  const isTest = b.is_test === true;
  const nameParts = rawName.split(/\s+/);
  const firstName = nameParts[0] ?? null;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;

  // Fire CAPI Lead — use service client to read secret capi_access_token
  const serviceClient = createServiceClient();
  const { data: pixelData } = await serviceClient
    .from("products")
    .select("pixel_id, capi_access_token, capi_test_event_code, name")
    .eq("id", productId)
    .single();

  if (pixelData?.pixel_id && pixelData?.capi_access_token) {
    const sourceUrl =
      request.headers.get("referer") ??
      `https://${request.headers.get("host") ?? "unknown"}`;

    sendCAPIEvent({
      pixelId: pixelData.pixel_id,
      accessToken: pixelData.capi_access_token,
      testEventCode: pixelData.capi_test_event_code,
      eventName: "Lead",
      eventId: result.event_id_lead,
      eventTime: Math.floor(Date.now() / 1000),
      sourceUrl,
      phone: normaliseNGPhone(rawPhone),
      firstName,
      lastName,
      city: rawCity,
      state: rawState,
      clientIp,
      clientUserAgent,
      fbp: typeof b.fbp === "string" ? b.fbp : null,
      fbc: typeof b.fbc === "string" ? b.fbc : null,
      currency: "NGN",
      value: result.total,
      contentName: pixelData.name,
      log: { productId, leadId: result.id, test: isTest },
    }).catch((err: unknown) => console.error("CAPI Lead:", err));
  }

  // Push notification to admin devices (non-blocking); skip test orders
  if (!isTest) {
    sendPushToAll({
      title: `New order: ${result.order_number}`,
      body: `${result.name} — ₦${result.total.toLocaleString("en-NG")}`,
      url: "/admin/leads",
    }).catch((err: unknown) => console.error("Push notification:", err));
  }

  return NextResponse.json(result, { status: 201 });
}
