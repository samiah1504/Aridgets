import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePerm } from "@/lib/auth";
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
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">{product.name}</h1>
      <ProductForm product={product} permissions={staff.permissions} />
    </div>
  );
}
