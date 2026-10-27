import Link from "next/link";
import type { Metadata } from "next";
import { requirePerm } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatNGN } from "@/lib/utils/currency";
import { byProduct, computeMetrics, quickRanges, rate, resolveRange, type AnalyticsOrder } from "@/lib/analytics";
import ProductPerformanceTable, { type ProductRow } from "@/components/admin/ProductPerformanceTable";

export const metadata: Metadata = { title: "Analytics" };

type SearchParams = Promise<{ from?: string; to?: string; product?: string }>;

const PAGE = 1000; // PostgREST returns at most 1000 rows per request

const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePerm("analytics.view");
  const sp = await searchParams;
  const range = resolveRange(sp.from, sp.to);
  const productFilter = sp.product && /^[0-9a-f-]{36}$/i.test(sp.product) ? sp.product : "";

  // Aggregates only (no customer details), so the service role is used:
  // staff with analytics access may not have lead-level access.
  const service = createServiceClient();
  const { data: products } = await service.from("products").select("id, name, slug").order("name");

  const orders: (AnalyticsOrder & { id: string; order_number: string; purchase_event_error: string | null })[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = service
      .from("leads")
      .select("id, order_number, product_id, status, total, amount_paid, confirmed_at, delivered_at, purchase_event_status, purchase_event_error")
      .eq("is_test", false)
      .gte("created_at", range.startIso)
      .lte("created_at", range.endIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (productFilter) q = q.eq("product_id", productFilter);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    orders.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const m = computeMetrics(orders);
  const perProduct = byProduct(orders);
  const productRows: ProductRow[] = [...perProduct].map(([pid, pm]) => {
    const p = products?.find((x) => x.id === pid);
    return {
      id: pid ?? "deleted",
      name: p?.name ?? "Deleted product",
      slug: p?.slug ?? null,
      orders: pm.orders,
      confirmed: pm.confirmed,
      delivered: pm.delivered,
      paid: pm.paid,
      cancelled: pm.cancelled,
      orderValue: pm.orderValue,
      collected: pm.collected,
      avgPaid: pm.paid ? Math.round(pm.paidValue / pm.paid) : null,
      confirmationRate: rate(pm.confirmed, pm.orders),
      paidRate: rate(pm.paid, pm.orders),
    };
  });
  const attention = orders.filter((o) => o.purchase_event_status === "failed" || o.purchase_event_status === "pending").slice(0, 10);

  const { today, quick } = quickRanges();
  const qs = (from: string, to: string) =>
    `/admin/analytics?from=${from}&to=${to}${productFilter ? `&product=${productFilter}` : ""}`;

  const cards: { label: string; value: string; sub?: string; tone?: string }[] = [
    { label: "Orders received", value: String(m.orders) },
    { label: "Confirmed", value: String(m.confirmed), sub: `${pct(rate(m.confirmed, m.orders))} confirmation rate` },
    { label: "Delivered", value: String(m.delivered) },
    { label: "Paid", value: String(m.paid), sub: `${pct(rate(m.paid, m.orders))} paid conversion`, tone: "text-emerald-700" },
    { label: "Cancelled", value: String(m.cancelled) },
    { label: "Not buying", value: String(m.notBuying) },
    { label: "Not picking calls", value: String(m.notPickingCalls) },
    { label: "Total order value", value: formatNGN(m.orderValue), sub: "All orders received, before payment" },
    { label: "Amount collected", value: formatNGN(m.collected), sub: "Payments recorded on these orders", tone: "text-emerald-700" },
    { label: "Outstanding balance", value: formatNGN(m.outstanding), sub: "Confirmed/delivered orders not yet fully paid", tone: m.outstanding ? "text-amber-700" : undefined },
    { label: "Meta Purchase sent", value: String(m.purchaseSent), sub: "Accepted by Meta" },
    { label: "Purchase pending / failed", value: String(m.purchasePendingOrFailed), tone: m.purchasePendingOrFailed ? "text-red-600" : undefined },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

      {/* Filters (plain GET form: works without JavaScript) */}
      <form method="get" className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <label className="text-xs font-medium text-gray-500">
            From
            <input type="date" name="from" defaultValue={range.from} max={today} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-base sm:text-sm text-gray-900" />
          </label>
          <label className="text-xs font-medium text-gray-500">
            To
            <input type="date" name="to" defaultValue={range.to} max={today} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-base sm:text-sm text-gray-900" />
          </label>
          <label className="col-span-2 sm:col-span-1 text-xs font-medium text-gray-500">
            Product / sales page
            <select name="product" defaultValue={productFilter} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-base sm:text-sm text-gray-900 bg-white">
              <option value="">All products</option>
              {products?.map((p) => <option key={p.id} value={p.id}>{p.name} (/p/{p.slug})</option>)}
            </select>
          </label>
          <button type="submit" className="col-span-2 sm:col-span-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            Apply
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <Link
              key={q.label}
              href={qs(q.from, q.to)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                q.from === range.from && q.to === range.to ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {q.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Showing orders received {range.from} to {range.to} (Lagos time), excluding test orders.
        </p>
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-400 mb-1">{c.label}</p>
            <p className={`text-xl sm:text-2xl font-bold leading-tight ${c.tone ?? "text-gray-900"}`}>{c.value}</p>
            {c.sub && <p className="text-[11px] text-gray-400 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {attention.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 p-4">
          <h2 className="text-sm font-semibold text-red-700 mb-2">Purchase events needing attention</h2>
          <ul className="divide-y divide-gray-50 text-sm">
            {attention.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-mono text-xs text-gray-700">{o.order_number}</span>
                <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">{o.purchase_event_error ?? "Waiting to be sent"}</span>
                <Link href={`/admin/leads/${o.id}`} className="text-xs font-semibold text-indigo-600">Open & retry →</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Product performance</h2>
        </div>
        <ProductPerformanceTable rows={productRows} />
      </div>

      <details className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-600">
        <summary className="cursor-pointer font-semibold text-gray-700">How these numbers are calculated</summary>
        <ul className="mt-3 list-disc pl-5 space-y-1.5 text-xs leading-relaxed">
          <li>Orders are included by the date they were <strong>received</strong> (Lagos time). All figures describe those orders, so the same order is never counted twice, however often its status changed.</li>
          <li><strong>Confirmed</strong>: orders that reached confirmation (confirmed, delivered or paid now, or confirmed at some point).</li>
          <li><strong>Delivered</strong>: marked Delivered, or Paid (customers pay on delivery).</li>
          <li><strong>Paid</strong>: payments recorded cover the full order total.</li>
          <li><strong>Cancelled / Not buying / Not picking calls</strong>: the order&apos;s current status.</li>
          <li><strong>Total order value</strong>: sum of order totals for all orders received — not money collected.</li>
          <li><strong>Amount collected</strong>: sum of payments recorded on these orders (partial payments included).</li>
          <li><strong>Outstanding balance</strong>: unpaid remainder on confirmed, delivered or paid orders. Cancelled and dropped orders are excluded.</li>
          <li><strong>Confirmation rate</strong> = confirmed ÷ orders received. <strong>Paid conversion</strong> = paid ÷ orders received. <strong>Average paid order</strong> = collected on paid orders ÷ paid orders.</li>
          <li><strong>Meta Purchase sent</strong>: Purchase events Meta accepted for these orders, including ones sent at confirmation before payment tracking existed.</li>
          <li>Each order is for one product, so its value and payments count only toward that product.</li>
        </ul>
      </details>
    </div>
  );
}
