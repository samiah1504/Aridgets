import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatNGN } from "@/lib/utils/currency";
import type { LeadStatus } from "@/types";

export const metadata: Metadata = { title: "Leads" };

type SearchParams = Promise<{ status?: string }>;

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  buying: "Buying",
  delivery: "Delivery",
  paid: "Paid",
  not_buying: "Not Buying",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  buying: "bg-yellow-100 text-yellow-700",
  delivery: "bg-purple-100 text-purple-700",
  paid: "bg-green-100 text-green-700",
  not_buying: "bg-gray-100 text-gray-500",
};

const TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "buying", label: "Buying" },
  { value: "delivery", label: "Delivery" },
  { value: "paid", label: "Paid" },
  { value: "not_buying", label: "Not Buying" },
];

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select("id, order_number, name, phone, state, total, status, created_at, products(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "") {
    query = query.eq("status", status as LeadStatus);
  }

  const { data: leads } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Leads</h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const href = tab.value ? `/admin/leads?status=${tab.value}` : "/admin/leads";
          const active = (status ?? "") === tab.value;
          return (
            <Link
              key={tab.value}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {!leads?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          No leads yet.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {leads.map((lead) => {
              const product = lead.products as { name: string } | null;
              const statusKey = lead.status as LeadStatus;
              const date = new Date(lead.created_at);
              return (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{lead.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.order_number}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        STATUS_STYLES[statusKey] ?? STATUS_STYLES.new
                      }`}
                    >
                      {STATUS_LABELS[statusKey] ?? lead.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-500 text-xs space-y-0.5">
                      <p>{lead.phone}</p>
                      {product?.name && (
                        <p className="truncate max-w-[180px]">{product.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatNGN(lead.total)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {date.toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leads.map((lead) => {
                    const product = lead.products as { name: string } | null;
                    const statusKey = lead.status as LeadStatus;
                    const date = new Date(lead.created_at);
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{lead.order_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
                        <td className="px-4 py-3 text-gray-600">{lead.state}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{product?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{formatNGN(lead.total)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                              STATUS_STYLES[statusKey] ?? STATUS_STYLES.new
                            }`}
                          >
                            {STATUS_LABELS[statusKey] ?? lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {date.toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium transition text-xs"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
