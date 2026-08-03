"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setProductStatus(id: string, status: "live" | "draft") {
  const supabase = await createClient();
  await supabase.from("products").update({ status }).eq("id", id);
  revalidatePath("/admin/products");
}

export async function archiveProduct(id: string) {
  const supabase = await createClient();
  await supabase.from("products").update({ status: "archived" }).eq("id", id);
  revalidatePath("/admin/products");
}

export async function restoreProduct(id: string) {
  const supabase = await createClient();
  await supabase.from("products").update({ status: "draft" }).eq("id", id);
  revalidatePath("/admin/products");
}

export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Remove uploaded files for this product from storage (best-effort —
  // media/variant/tracking rows are removed by ON DELETE CASCADE)
  const { data: files } = await supabase.storage.from("product-media").list(id);
  if (files?.length) {
    await supabase.storage
      .from("product-media")
      .remove(files.map((f) => `${id}/${f.name}`));
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
  return { error: error?.message ?? null };
}

export async function duplicateProduct(id: string) {
  const supabase = await createClient();
  const { data: src } = await supabase
    .from("products")
    .select(
      "name, slug, status, currency, price, compare_at_price, theme, content, sections, pixel_id, capi_test_event_code, whatsapp_number, show_on_homepage"
    )
    .eq("id", id)
    .single();
  if (!src) return;

  const suffix = Date.now().toString(36).slice(-5);
  await supabase.from("products").insert({
    ...src,
    name: `${src.name} (Copy)`,
    slug: `${src.slug}-${suffix}`,
    status: "draft" as const,
  });
  revalidatePath("/admin/products");
}
