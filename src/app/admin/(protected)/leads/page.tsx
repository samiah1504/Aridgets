import Link from "next/link";
import type { Metadata } from "next";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePerm, hasPerm } from "@/lib/auth";
import { formatNGN } from "@/lib/utils/currency";
import LeadQuickActions from "@/components/admin/LeadQuickActions";
import LeadProductFilter from "@/components/admin/LeadProductFilter";
import { LEAD_STATUSES, STATUS_BADGE as STATUS_STYLES, STATUS_LABELS } from "@/lib/leadStatus";
import type { LeadStatus } from "@/types";

const TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  ...LEAD_STATUSES.map((s) => ({ value: s.value, label: s.value === "new" ? "New" : s.label })),
];

const PAGE_SIZE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Leads" };

type SearchParams = Promise<{ status?: string; product?: string; page?: string }>;

function leadsHref(params: { product?: string; status?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.product) qs.set("product", params.product);
  if (params.status) qs.set("status", params.status);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const s = qs.toString();
  return s ? `/admin/leads?${s}` : "/admin/leads";
}

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const staff = await requirePerm(["leads.view_all", "leads.view_assigned"]);
  const canViewContact = hasPerm(staff.permissions, "customers.view_contact");
  const canChangeStatus = hasPerm(staff.permissions, "leads.change_status");
  const sp = await searchParams;
  const status = TABS.some((t) => t.value === sp.status) ? (sp.status ?? "") : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const supabase = await createClient();

  // Products for the picker: every product for staff who see all leads,
  // otherwise only the products assigned to them. Names only; which leads
  // are visible is still decided by RLS on leads.
  const service = createServiceClient();
  let productList: Array<{ id: string; slug: string; name: string }> = [];
  if (hasPerm(staff.permissions, "leads.view_all")) {
    const { data } = await service.from("products").select("id, slug, name").order("name");
    productList = data ?? [];
  } else {
    const { data: assigned } = await service
      .from("product_assignments")
      .select("product_id")
      .eq("profile_id", staff.userId);
    const ids = (assigned ?? []).map((a) => a.product_id);
    if (ids.length) {
      const { data } = await service.from("products").select("id, slug, name").in("id", ids).order("name");
      productList = data ?? [];
    }
  }

  // ?product= takes a slug (links we build) or an id (older links)
  const selected = sp.product
    ? productList.find((p) => (UUID_RE.test(sp.product!) ? p.id === sp.product : p.slug === sp.product))
    : undefined;
  const productFilter = selected?.slug ?? "";

  let query = supabase
    .from("leads")
    .select("id, order_number, name, phone, state, total, status, is_test, created_at, purchase_option, products(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (selected) query = query.eq("product_id", selected.id);
  if (status) query = query.eq("status", status as LeadStatus);

  // Count per status tab for the chosen product
  const countFor = (value: string) => {
    let q = supabase.from("leads").select("id", { count: "exact", head: true });
    if (selected) q = q.eq("product_id", selected.id);
    if (value) q = q.eq("status", value as LeadStatus);
    return q.then(({ count }) => [value, count ?? 0] as const);
  };

  const [{ data: leads, count }, tabCounts] = await Promise.all([
    query,
    Promise.all(TABS.map((t) => countFor(t.value))),
  ]);
  const counts = Object.fromEntries(tabCounts) as Record<string, number>;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const notFoundProduct = Boolean(sp.product) && !selected;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          Leads
          {selected && <span className="text-gray-400 font-medium"> · {selected.name}</span>}
        </h1>
        {productList.length > 0 && (
          <LeadProductFilter products={productList} value={productFilter} status={status} />
        )}
      </div>

      {notFoundProduct && (
        <p className="mb-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          That product wasn&apos;t found or isn&apos;t assigned to you — showing all products.
        </p>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={leadsHref({ product: productFilter, status: tab.value })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${active ? "text-gray-300" : "text-gray-400"}`}>{counts[tab.value] ?? 0}</span>
            </Link>
          );
        })}
      </div>

      {!leads?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          {page > 1 ? (
            <>No leads on this page. <Link href={leadsHref({ product: productFilter, status })} className="text-indigo-600 underline">Go to the first page</Link></>
          ) : selected || status ? "No leads match this filter." : "No leads yet."}
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
                <div
                  key={lead.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
                >
                  <Link href={`/admin/leads/${lead.id}`} className="block">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {lead.name}
                          {lead.is_test && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 align-middle">
                              TEST
                            </span>
                          )}
                        </p>
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
                        {canViewContact && <p>{lead.phone}</p>}
                        {product?.name && (
                          <p className="truncate max-w-[180px]">
                            {product.name}
                            {lead.purchase_option && ` · ${lead.purchase_option.name}`}
                          </p>
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
                  <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                    <LeadQuickActions
                      leadId={lead.id}
                      phone={canViewContact ? lead.phone : null}
                      customerName={lead.name}
                      productName={product?.name ?? "your order"}
                      total={lead.total}
                      status={statusKey}
                      canChangeStatus={canChangeStatus}
                      actorName={staff.fullName}
                    />
                  </div>
                </div>
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
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {lead.name}
                          {lead.is_test && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                              TEST
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{canViewContact ? lead.phone : "•••"}</td>
                        <td className="px-4 py-3 text-gray-600">{lead.state}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {product?.name ?? "—"}
                          {lead.purchase_option && (
                            <span className="block text-gray-400">{lead.purchase_option.name}</span>
                          )}
                        </td>
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
                        <td className="px-4 py-3">
                          <LeadQuickActions
                            leadId={lead.id}
                            phone={canViewContact ? lead.phone : null}
                            customerName={lead.name}
                            productName={product?.name ?? "your order"}
                            total={lead.total}
                            status={statusKey}
                            canChangeStatus={canChangeStatus}
                            actorName={staff.fullName}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
              {page > 1 ? (
                <Link href={leadsHref({ product: productFilter, status, page: page - 1 })} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                  ‹ Newer
                </Link>
              ) : <span />}
              <span className="text-gray-500">Page {page} of {totalPages} · {count} leads</span>
              {page < totalPages ? (
                <Link href={leadsHref({ product: productFilter, status, page: page + 1 })} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                  Older ›
                </Link>
              ) : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
