import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isValidNGPhone, normaliseNGPhone } from "@/lib/utils/phone";
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
  const rawLga = typeof b.lga === "string" ? b.lga.trim() : null;
  const quantity = Math.max(1, Math.round(Number(b.quantity ?? 1)));

  if (!productId) return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  if (!rawName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!rawPhone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  if (!isValidNGPhone(rawPhone)) {
    return NextResponse.json({ error: "Enter a valid Nigerian phone number" }, { status: 400 });
  }
  if (!rawState) return NextResponse.json({ error: "State is required" }, { status: 400 });
  if (!rawAddress) return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });

  const supabase = await createClient();

  // Fetch product price (anon can read live products via RLS)
  const { data: rawProduct, error: productError } = await supabase
    .from("products")
    .select("id, price, status")
    .eq("id", productId)
    .single();

  if (productError || !rawProduct) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const product = rawProduct as { id: string; price: number; status: string };
  if (product.status !== "live") {
    return NextResponse.json({ error: "Product not available" }, { status: 404 });
  }

  const unitPrice = product.price;
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
    lga: rawLga || null,
    address: rawAddress,
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
  };

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert(insertPayload)
    .select("order_number, total, name")
    .single();

  if (insertError || !lead) {
    console.error("Lead insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }

  const result = lead as { order_number: string; total: number; name: string };
  return NextResponse.json(result, { status: 201 });
}
