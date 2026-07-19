import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isValidNGPhone, normaliseNGPhone } from "@/lib/utils/phone";

interface LeadPayload {
  product_id: string;
  name: string;
  phone: string;
  state: string;
  lga?: string;
  address: string;
  quantity?: number;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Partial<LeadPayload>;

  // Validate required fields
  if (!payload.product_id) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }
  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!payload.phone?.trim()) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }
  if (!isValidNGPhone(payload.phone)) {
    return NextResponse.json(
      { error: "Enter a valid Nigerian phone number" },
      { status: 400 }
    );
  }
  if (!payload.state?.trim()) {
    return NextResponse.json({ error: "State is required" }, { status: 400 });
  }
  if (!payload.address?.trim()) {
    return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
  }

  const quantity = Math.max(1, Math.round(Number(payload.quantity ?? 1)));

  // Fetch product to get live price
  const supabase = await createClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, price, status")
    .eq("id", payload.product_id)
    .eq("status", "live")
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const unitPrice = product.price;
  const total = unitPrice * quantity;

  // Grab client metadata from request headers
  const headerStore = await headers();
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const clientUserAgent = headerStore.get("user-agent") ?? null;

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      product_id: payload.product_id,
      name: payload.name.trim(),
      phone: normaliseNGPhone(payload.phone),
      state: payload.state.trim(),
      lga: payload.lga?.trim() || null,
      address: payload.address.trim(),
      quantity,
      unit_price: unitPrice,
      total,
      fbp: payload.fbp ?? null,
      fbc: payload.fbc ?? null,
      fbclid: payload.fbclid ?? null,
      utm_source: payload.utm_source ?? null,
      utm_medium: payload.utm_medium ?? null,
      utm_campaign: payload.utm_campaign ?? null,
      utm_content: payload.utm_content ?? null,
      client_ip: clientIp,
      client_user_agent: clientUserAgent,
    })
    .select("order_number, total, name")
    .single();

  if (insertError || !lead) {
    console.error("Lead insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(lead, { status: 201 });
}
