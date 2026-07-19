import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ProductsGrid, { type EnrichedProduct } from "@/components/admin/ProductsGrid";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: leads }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, slug, status, price, compare_at_price, theme, pixel_id, updated_at, created_at, product_media(url, slot, kind, sort_order)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("leads").select("product_id, status"),
  ]);

  // Aggregate lead counts per product
  const leadMap: Record<string, { total: number; paid: number }> = {};
  for (const l of leads ?? []) {
    const s = (leadMap[l.product_id] ??= { total: 0, paid: 0 });
    s.total++;
    if (l.status === "paid") s.paid++;
  }

  const enriched: EnrichedProduct[] = (products ?? []).map((p) => ({
    ...p,
    product_media: (p.product_media ?? []) as EnrichedProduct["product_media"],
    leadCount: leadMap[p.id]?.total ?? 0,
    paidCount: leadMap[p.id]?.paid ?? 0,
  }));

  return <ProductsGrid products={enriched} />;
}
