import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getStaff, hasPerm, hasAnyPerm } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatNGN } from "@/lib/utils/currency";
import type { LeadStatus } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

const FUNNEL: Array<{ status: LeadStatus; label: string; color: string }> = [
  { status: "new", label: "New Lead", color: "bg-yellow-500" },
  { status: "confirmed", label: "Confirmed", color: "bg-green-500" },
  { status: "not_buying", label: "Not Buying", color: "bg-red-400" },
  { status: "cancelled", label: "Cancelled", color: "bg-gray-400" },
  { status: "not_picking_calls", label: "Not Picking Calls", color: "bg-gray-300" },
];

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  not_buying: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-600",
  not_picking_calls: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New Lead",
  confirmed: "Confirmed",
  not_buying: "Not Buying",
  cancelled: "Cancelled",
  not_picking_calls: "Not Picking Calls",
};

export default async function DashboardPage() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");

  // Staff without analytics access get a personal work dashboard instead
  if (!hasPerm(staff.permissions, "analytics.view")) {
    return <MyWorkDashboard permissions={staff.permissions} name={staff.fullName} />;
  }

  const supabase = await createClient();

  const [{ data: allLeads }, { data: recentLeads }, { data: products }] = await Promise.all([
    supabase.from("leads").select("id, status, total, created_at, product_id").eq("is_test", false),
    supabase
      .from("leads")
      .select("id, order_number, name, total, status, created_at, products(name)")
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("products").select("id, name, status").order("created_at", { ascending: false }),
  ]);

  const leads = allLeads ?? [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const todayLeads = leads.filter((l) => new Date(l.created_at) >= todayStart).length;
  const weekLeads = leads.filter((l) => new Date(l.created_at) >= weekStart).length;
  const confirmedLeads = leads.filter((l) => l.status === "confirmed");
  const conversionRate =
    leads.length > 0 ? ((confirmedLeads.length / leads.length) * 100).toFixed(1) : "0.0";

  const funnelCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});
  const maxFunnelCount = Math.max(1, ...Object.values(funnelCounts));

  const productStats = (products ?? []).map((p) => {
    const pLeads = leads.filter((l) => l.product_id === p.id);
    const pConfirmed = pLeads.filter((l) => l.status === "confirmed");
    return {
      ...p,
      leadCount: pLeads.length,
      confirmedCount: pConfirmed.length,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's leads" value={todayLeads.toString()} />
        <StatCard label="This week's leads" value={weekLeads.toString()} />
        <StatCard label="Confirmed leads" value={confirmedLeads.length.toString()} />
        <StatCard
          label="Confirmation rate"
          value={`${conversionRate}%`}
          sub={`${confirmedLeads.length} of ${leads.length} leads`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent leads */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Recent leads</h2>
            <Link
              href="/admin/leads"
              className="text-xs text-indigo-600 hover:text-indigo-800 transition"
            >
              View all →
            </Link>
          </div>
          {!recentLeads?.length ? (
            <p className="px-5 py-10 text-sm text-gray-400 text-center">No leads yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {recentLeads.map((lead) => {
                  const product = lead.products as { name: string } | null;
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{lead.order_number}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 hidden sm:table-cell">
                        {product?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-800 text-right whitespace-nowrap">
                        {formatNGN(lead.total)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                            STATUS_BADGE[lead.status as LeadStatus] ?? STATUS_BADGE.new
                          }`}
                        >
                          {STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 transition"
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Lead funnel</h2>
          <div className="space-y-3">
            {FUNNEL.map(({ status, label, color }) => {
              const count = funnelCounts[status] ?? 0;
              const pct = Math.round((count / maxFunnelCount) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{label}</span>
                    <span className="text-gray-400 font-mono">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-xs text-gray-400">
            {leads.length} total · {confirmedLeads.length} confirmed
          </p>
        </div>
      </div>

      {/* Product performance */}
      {productStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Products</h2>
            <Link
              href="/admin/products"
              className="text-xs text-indigo-600 hover:text-indigo-800 transition"
            >
              Manage →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3 text-right">Leads</th>
                <th className="px-5 py-3 text-right">Confirmed</th>
                <th className="px-5 py-3 text-right">Conf. rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productStats.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        p.status === "live"
                          ? "bg-green-100 text-green-700"
                          : p.status === "draft"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{p.leadCount}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{p.confirmedCount}</td>
                  <td className="px-5 py-3 text-right text-gray-500">
                    {p.leadCount > 0
                      ? `${((p.confirmedCount / p.leadCount) * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Personal dashboard for staff without analytics access ────────────────────

async function MyWorkDashboard({
  permissions,
  name,
}: {
  permissions: string[];
  name: string | null;
}) {
  const supabase = await createClient();
  const canSeeLeads = hasAnyPerm(permissions, ["leads.view_all", "leads.view_assigned"]);
  const canSeeProducts = hasPerm(permissions, "products.view");

  // RLS scopes both queries to what this member may see
  const [{ data: myLeads }, { data: myProducts }] = await Promise.all([
    canSeeLeads
      ? supabase.from("leads").select("id, status, created_at, follow_up_at").eq("is_test", false)
      : Promise.resolve({ data: null }),
    canSeeProducts
      ? supabase.from("products").select("id, status")
      : Promise.resolve({ data: null }),
  ]);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const leadCounts = (myLeads ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});
  // Scheduled follow-ups due today (or overdue) on leads still in play
  const todaysFollowUps = (myLeads ?? []).filter(
    (l) =>
      l.follow_up_at &&
      new Date(l.follow_up_at) <= todayEnd &&
      (l.status === "new" || l.status === "not_picking_calls")
  ).length;

  const productCounts = (myProducts ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">
        Welcome{name ? `, ${name.split(" ")[0]}` : ""}
      </h1>

      {canSeeLeads && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            My Leads
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/leads?status=new" className="block">
              <StatCard label="Today's follow-ups" value={todaysFollowUps.toString()} />
            </Link>
            <Link href="/admin/leads?status=new" className="block">
              <StatCard label="New leads" value={(leadCounts.new ?? 0).toString()} />
            </Link>
            <Link href="/admin/leads?status=confirmed" className="block">
              <StatCard label="Confirmed" value={(leadCounts.confirmed ?? 0).toString()} />
            </Link>
            <Link href="/admin/leads?status=not_buying" className="block">
              <StatCard label="Not buying" value={(leadCounts.not_buying ?? 0).toString()} />
            </Link>
          </div>
          <Link
            href="/admin/leads"
            className="inline-block mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            Open my leads →
          </Link>
        </div>
      )}

      {canSeeProducts && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            My Products
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Drafts" value={(productCounts.draft ?? 0).toString()} />
            <StatCard label="Published" value={(productCounts.live ?? 0).toString()} />
            <StatCard label="Archived" value={(productCounts.archived ?? 0).toString()} />
            <StatCard
              label="Total"
              value={((myProducts ?? []).length).toString()}
            />
          </div>
          <Link
            href="/admin/products"
            className="inline-block mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            Open products →
          </Link>
        </div>
      )}

      {!canSeeLeads && !canSeeProducts && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <p className="font-medium">No workspace access yet.</p>
          <p className="text-sm mt-1">Ask your administrator to assign you a role.</p>
        </div>
      )}
    </div>
  );
}
