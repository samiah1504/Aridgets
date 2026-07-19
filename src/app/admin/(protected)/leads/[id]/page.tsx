import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatNGN } from "@/lib/utils/currency";
import LeadActions from "@/components/admin/LeadActions";
import type { LeadStatus } from "@/types";

type Params = Promise<{ id: string }>;

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  buying: "bg-yellow-100 text-yellow-700",
  delivery: "bg-purple-100 text-purple-700",
  paid: "bg-green-100 text-green-700",
  not_buying: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  buying: "Buying",
  delivery: "Delivery",
  paid: "Paid",
  not_buying: "Not Buying",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("order_number, name").eq("id", id).single();
  return { title: data ? `${data.order_number} · ${data.name}` : "Lead" };
}

export default async function LeadDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*, products(name, slug)")
    .eq("id", id)
    .single();

  if (!lead) notFound();

  const { data: history } = await supabase
    .from("lead_status_history")
    .select("id, from_status, to_status, note, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const product = lead.products as { name: string; slug: string } | null;
  const status = lead.status as LeadStatus;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/admin/leads" className="hover:text-gray-700 transition">
          Leads
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{lead.order_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{lead.order_number}</p>
        </div>
        <span
          className={`mt-1 inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
            STATUS_STYLES[status] ?? STATUS_STYLES.new
          }`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer + Order info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Customer
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-400">Phone</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  <a href={`tel:${lead.phone}`} className="hover:text-indigo-600 transition">
                    {lead.phone}
                  </a>
                </dd>
              </div>
              {lead.email && (
                <div>
                  <dt className="text-gray-400">Email</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{lead.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400">State</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{lead.state}</dd>
              </div>
              {lead.lga && (
                <div>
                  <dt className="text-gray-400">LGA</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{lead.lga}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-gray-400">Address</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{lead.address}</dd>
              </div>
            </dl>
          </div>

          {/* Order info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Order
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-400">Product</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {product ? (
                    <a
                      href={`/p/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-600 transition"
                    >
                      {product.name} ↗
                    </a>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Quantity</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{lead.quantity}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Unit price</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{formatNGN(lead.unit_price)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Total</dt>
                <dd className="font-bold text-gray-900 text-base mt-0.5">{formatNGN(lead.total)}</dd>
              </div>
              {lead.selected_options &&
                Object.keys(lead.selected_options as Record<string, string>).length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-gray-400">Variant</dt>
                    <dd className="font-medium text-gray-900 mt-0.5">
                      {Object.entries(lead.selected_options as Record<string, string>)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </dd>
                  </div>
                )}
              <div>
                <dt className="text-gray-400">Submitted</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {new Date(lead.created_at).toLocaleString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              {lead.utm_source && (
                <div>
                  <dt className="text-gray-400">Source</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">
                    {[lead.utm_source, lead.utm_medium, lead.utm_campaign]
                      .filter(Boolean)
                      .join(" / ")}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status history */}
          {history && history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                History
              </h2>
              <ol className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="flex items-start gap-3 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
                    <div>
                      <span className="text-gray-700 font-medium capitalize">
                        {h.from_status ?? "—"} → {h.to_status}
                      </span>
                      {h.note && (
                        <p className="text-gray-400 text-xs mt-0.5">{h.note}</p>
                      )}
                      <p className="text-gray-300 text-xs mt-0.5">
                        {new Date(h.created_at).toLocaleString("en-NG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit">
          <LeadActions
            leadId={lead.id}
            currentStatus={status}
            callNotes={lead.call_notes}
          />
        </div>
      </div>
    </div>
  );
}
