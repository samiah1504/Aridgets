import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePerm, hasPerm, hasAnyPerm } from "@/lib/auth";
import ProductForm from "@/components/admin/ProductForm";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name")
    .eq("id", id)
    .single();
  return { title: data?.name ?? "Edit product" };
}

export default async function EditProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const staff = await requirePerm("products.edit");
  const supabase = await createClient();
  // capi_access_token is excluded: the authenticated role has no column
  // privilege on it (see migration 23) — it is fetched via the service role
  // below, and only for staff allowed to edit tracking settings.
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, slug, name, status, currency, price, compare_at_price, theme, content, sections, pixel_id, capi_test_event_code, whatsapp_number, show_on_homepage, template_type, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (!product) notFound();

  let capiAccessToken: string | null = null;
  if (hasPerm(staff.permissions, "tracking.edit")) {
    const service = createServiceClient();
    const { data: secret } = await service
      .from("products")
      .select("capi_access_token")
      .eq("id", id)
      .single();
    capiAccessToken = secret?.capi_access_token ?? null;
  }

  const safeProduct = { ...product, capi_access_token: capiAccessToken };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900 min-w-0 truncate">{product.name}</h1>
        {hasAnyPerm(staff.permissions, ["leads.view_all", "leads.view_assigned"]) && (
          <Link
            href={`/admin/leads?product=${product.slug}`}
            className="shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            View leads
          </Link>
        )}
      </div>
      <ProductForm product={safeProduct} permissions={staff.permissions} />
    </div>
  );
}
