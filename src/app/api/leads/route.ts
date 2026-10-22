import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isValidNGPhone, normaliseNGPhone } from "@/lib/utils/phone";
import { NIGERIAN_STATES } from "@/lib/constants/states";
import { sendCAPIEvent } from "@/lib/capi";
import { sendPushToAll } from "@/lib/push";
import {
  quantityBounds,
  resolveDeliverySettings,
  toSnapshot,
  validateDeliveryDate,
} from "@/lib/purchaseOptions";
import type { DeliveryPreference, ProductContent, PurchaseOptionSnapshot } from "@/types";
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
  const rawName = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
  const rawPhone = typeof b.phone === "string" ? b.phone.trim() : "";
  const rawState = typeof b.state === "string" ? b.state.trim() : "";
  const rawAddress = typeof b.address === "string" ? b.address.trim().slice(0, 500) : "";
  const rawCity = typeof b.city === "string" ? b.city.trim().slice(0, 80) : null;
  let quantity = Math.min(20, Math.max(1, Math.round(Number(b.quantity ?? 1)) || 1));

  if (!productId) return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  if (!rawName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!rawPhone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  if (!isValidNGPhone(rawPhone)) {
    return NextResponse.json({ error: "Enter a valid Nigerian phone number" }, { status: 400 });
  }
  if (!NIGERIAN_STATES.includes(rawState as (typeof NIGERIAN_STATES)[number])) {
    return NextResponse.json({ error: "Please select a valid state" }, { status: 400 });
  }
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
    .select("id, price, status, content, template_type")
    .eq("id", productId)
    .single();

  if (productError || !rawProduct) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const product = rawProduct as {
    id: string;
    price: number;
    status: string;
    content: ProductContent | null;
    template_type: string | null;
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
  let validVariantId: string | null = null;
  let purchaseOption: PurchaseOptionSnapshot | null = null;

  if (product.template_type === "options_bundles") {
    // Purchasing options: the price always comes from the saved product
    // configuration. Any price or total the browser sends is ignored, and a
    // mismatch with what the customer was shown is rejected.
    const optionId = typeof b.purchase_option_id === "string" ? b.purchase_option_id : "";
    if (!optionId) {
      return NextResponse.json({ error: "Please choose an option" }, { status: 400 });
    }
    const option = (product.content?.purchaseOptions ?? []).find((o) => o.id === optionId);
    if (!option || !option.active) {
      return NextResponse.json(
        { error: "That option is no longer available. Please refresh the page and choose again." },
        { status: 400 }
      );
    }
    const { min, max } = quantityBounds(option);
    const requestedQty = b.quantity;
    if (typeof requestedQty !== "number" || !Number.isInteger(requestedQty) || requestedQty < min || requestedQty > max) {
      return NextResponse.json(
        { error: `Quantity must be a whole number from ${min} to ${max}` },
        { status: 400 }
      );
    }
    const shownPriceChanged =
      (b.expected_unit_price !== undefined && b.expected_unit_price !== option.price) ||
      (b.expected_total !== undefined && b.expected_total !== option.price * requestedQty);
    if (shownPriceChanged) {
      return NextResponse.json(
        { error: "The price of this option has changed. Please refresh the page to see the current price." },
        { status: 409 }
      );
    }
    unitPrice = option.price;
    quantity = requestedQty;
    purchaseOption = toSnapshot(option);
  } else if (variantId) {
    // If a variant was selected, validate it and use its price_override.
    // Only a variant that actually exists is stored — a bogus ID from a
    // tampered request must never make the insert fail.
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id, price_override, active")
      .eq("id", variantId)
      .eq("product_id", productId)
      .single();
    if (variant?.active) {
      validVariantId = variant.id;
      if (variant.price_override !== null && variant.price_override !== undefined) {
        unitPrice = variant.price_override as number;
      }
    }
  }

  const total = unitPrice * quantity;

  // Delivery preference (a customer preference, not a delivery commitment)
  const delivery = resolveDeliverySettings(product.content, product.template_type);
  let deliveryPreference: DeliveryPreference | null = null;
  let deliveryDate: string | null = null;
  if (delivery.enabled) {
    if (b.delivery_preference !== "asap" && b.delivery_preference !== "date") {
      return NextResponse.json({ error: "Please tell us when you want it delivered" }, { status: 400 });
    }
    deliveryPreference = b.delivery_preference;
    if (deliveryPreference === "date") {
      const dateError = validateDeliveryDate(b.delivery_date);
      if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
      deliveryDate = b.delivery_date as string;
    }
  }

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
    variant_id: validVariantId || undefined,
    purchase_option_id: purchaseOption?.id ?? null,
    purchase_option: purchaseOption,
    delivery_preference: deliveryPreference,
    delivery_date: deliveryDate,
    selected_options: rawSelectedOptions || undefined,
    is_test: b.is_test === true,
    tracking_session_id:
      typeof b.session_id === "string" ? b.session_id.slice(0, 64) : null,
  };

  // Insert with the service role: direct anonymous inserts to the leads table
  // are closed at the database level (bots were able to probe the public REST
  // endpoint) — this validated route is now the only way in.
  const insertClient = createServiceClient();
  const { data: lead, error: insertError } = await insertClient
    .from("leads")
    .insert(insertPayload)
    .select("id, order_number, total, name, event_id_lead")
    .single();

  if (insertError || !lead) {
    console.error("Lead insert error:", insertError);
    // Record the failed attempt so it is visible in the admin (Pixel & CAPI
    // page) — a customer who hit an error must never disappear silently.
    await insertClient
      .from("tracking_events")
      .insert({
        product_id: productId,
        session_id: insertPayload.tracking_session_id ?? null,
        event_name: "Lead",
        source: "server",
        status: "failed",
        error: `Order save failed: ${insertError?.message ?? "unknown error"}`,
        test: insertPayload.is_test ?? false,
      })
      .then(() => {});
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

    // Awaited: on serverless the function freezes once the response is sent —
    // an un-awaited send can be killed mid-flight and never reach Meta.
    await sendCAPIEvent({
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

  // Push notification to admin devices; skip test orders.
  // Awaited for the same serverless reason — otherwise it may never send.
  if (!isTest) {
    await sendPushToAll({
      title: `New order: ${result.order_number}`,
      body: `${result.name} — ₦${result.total.toLocaleString("en-NG")}`,
      url: "/admin/leads",
    }).catch((err: unknown) => console.error("Push notification:", err));
  }

  return NextResponse.json(result, { status: 201 });
}
