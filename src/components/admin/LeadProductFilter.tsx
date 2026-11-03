"use client";

import { useRouter } from "next/navigation";

// Product picker on the Leads page: "All products" or one product. Keeps the
// current status tab and goes back to the first page.

interface Props {
  products: Array<{ slug: string; name: string }>;
  value: string;
  status: string;
}

export default function LeadProductFilter({ products, value, status }: Props) {
  const router = useRouter();

  function choose(slug: string) {
    const params = new URLSearchParams();
    if (slug) params.set("product", slug);
    if (status) params.set("status", status);
    const qs = params.toString();
    router.push(qs ? `/admin/leads?${qs}` : "/admin/leads");
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 shrink-0">Product</span>
      <select
        value={value}
        onChange={(e) => choose(e.target.value)}
        className="min-w-0 w-full sm:w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All products</option>
        {products.map((p) => (
          <option key={p.slug} value={p.slug}>{p.name}</option>
        ))}
      </select>
    </label>
  );
}
