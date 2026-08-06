import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Public, privacy-safe feed of recent real orders for the social-proof popup.
// Returns first name + city/state + product name only — never full names,
// phone numbers, or addresses. Test orders are excluded.
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("product_id") ?? "";
  if (!productId) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  const service = createServiceClient();

  // Only serve the feed for real, live products
  const { data: product } = await service
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .single();
  if (!product || product.status !== "live") {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }

  const { data: leads } = await service
    .from("leads")
    .select("name, city, state, created_at, products(name)")
    .eq("is_test", false)
    .not("product_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(12);

  const orders = (leads ?? [])
    .map((l) => {
      const productName = (l.products as { name: string } | null)?.name;
      if (!productName) return null;
      return {
        // First name only — sanitized server-side so the full name never leaves
        first_name: (l.name ?? "").trim().split(/\s+/)[0] || "Someone",
        place: l.city || l.state || "Nigeria",
        product: productName,
        at: l.created_at,
      };
    })
    .filter(Boolean);

  return NextResponse.json(
    { orders },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
