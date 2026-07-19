import type { Metadata } from "next";
import { requirePerm } from "@/lib/auth";
import NewProductForm from "@/components/admin/NewProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requirePerm("products.create");
  return <NewProductForm />;
}
