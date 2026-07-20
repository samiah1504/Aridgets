import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePerm, hasPerm } from "@/lib/auth";
import { formatNGN } from "@/lib/utils/currency";
import LeadActions from "@/components/admin/LeadActions";
import AssignLead from "@/components/admin/AssignLead";
import ContactButtons from "@/components/admin/ContactButtons";
import FollowUpPanel from "@/components/admin/FollowUpPanel";
import type { LeadStatus } from "@/types";

type Params = Promise<{ id: string }>;

const STATUS_STYLES: Record<LeadStatus, string> = {
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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("order_number, name").eq("id", id).single();
  return { title: data ? `${data.order_number} · ${data.name}` : "Lead" };
}

export default async function LeadDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const staff = await requirePerm(["leads.view_all", "leads.view_assigned"]);
  const canViewContact = hasPerm(staff.permissions, "customers.view_contact");
  const canChangeStatus = hasPerm(staff.permissions, "leads.change_status");
  const canEditNotes = hasPerm(staff.permissions, "leads.edit_notes");
  const canAssign = hasPerm(staff.permissions, "leads.assign");
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*, products(name, slug, product_media(url, slot, kind, sort_order))")
    .eq("id", id)
    .single();

  if (!lead) notFound();

  const [{ data: history }, { data: activities }] = await Promise.all([
    supabase
      .from("lead_status_history")
      .select("id, from_status, to_status, note, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_activities")
      .select("id, actor_name, kind, detail, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);

  // Staff list for the assignment control (only when the viewer can assign)
  const { data: assignableStaff } = canAssign
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("active", true)
        .order("full_name")
    : { data: null };

  const product = lead.products as {
    name: string;
    slug: string;
    product_media: Array<{ url: string; slot: string; kind: string; sort_order: number }> | null;
  } | null;
  const status = lead.status as LeadStatus;

  const productImages = (product?.product_media ?? [])
    .filter((m) => m.kind === "image")
    .sort((a, b) => a.sort_order - b.sort_order);
  const productImage =
    productImages.find((m) => m.slot === "hero")?.url ?? productImages[0]?.url ?? null;

  // Merge status changes and contact activities into one timeline
  type TimelineEntry = { id: string; text: string; sub: string | null; created_at: string };
  const ACTIVITY_LABELS: Record<string, string> = {
    call_opened: "opened the call action for this customer",
    whatsapp_opened: "opened WhatsApp for this customer",
    contacted: "marked the customer as contacted",
    note: "added a note",
  };
  const timeline: TimelineEntry[] = [
    ...(history ?? []).map((h) => ({
      id: `h-${h.id}`,
      text: `Status changed: ${h.from_status ?? "—"} → ${h.to_status}`,
      sub: h.note,
      created_at: h.created_at,
    })),
    ...(activities ?? []).map((a) => ({
      id: `a-${a.id}`,
      text: `${a.actor_name ?? "A staff member"} ${ACTIVITY_LABELS[a.kind] ?? a.kind}`,
      sub: a.detail,
      created_at: a.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
            {canViewContact && (
              <div className="mb-4">
                <ContactButtons
                  leadId={lead.id}
                  phone={lead.phone}
                  customerName={lead.name}
                  productName={product?.name ?? "your order"}
                  total={lead.total}
                  actorName={staff.fullName}
                />
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {canViewContact && (
                <div>
                  <dt className="text-gray-400">Phone</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">
                    <a href={`tel:${lead.phone}`} className="hover:text-indigo-600 transition">
                      {lead.phone}
                    </a>
                  </dd>
                </div>
              )}
              {canViewContact && lead.email && (
                <div>
                  <dt className="text-gray-400">Email</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{lead.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400">State</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{lead.state}</dd>
              </div>
              {lead.city && (
                <div>
                  <dt className="text-gray-400">City / Town</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{lead.city}</dd>
                </div>
              )}
              {canViewContact ? (
                <div className="col-span-2">
                  <dt className="text-gray-400">Address</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{lead.address}</dd>
                </div>
              ) : (
                <div className="col-span-2">
                  <dd className="text-xs text-gray-400">
                    Contact details hidden — you don&apos;t have permission to view customer contact
                    information.
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Order info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Order
            </h2>
            {product && (
              <div className="flex items-center gap-3 mb-4">
                {productImage && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={productImage} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <a
                    href={`/p/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gray-900 hover:text-indigo-600 transition"
                  >
                    {product.name} ↗
                  </a>
                </div>
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
              {lead.confirmed_at && (
                <div>
                  <dt className="text-gray-400">Confirmed</dt>
                  <dd className="font-medium text-green-700 mt-0.5">
                    {new Date(lead.confirmed_at).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
              )}
              {lead.dropped_at && (
                <div>
                  <dt className="text-gray-400">Dropped</dt>
                  <dd className="font-medium text-red-600 mt-0.5">
                    {new Date(lead.dropped_at).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400">Serious-buyer confirmation</dt>
                <dd className={`font-medium mt-0.5 ${lead.buyer_confirmed ? "text-green-700" : "text-gray-500"}`}>
                  {lead.buyer_confirmed ? "Confirmed ✓" : "Not confirmed"}
                </dd>
              </div>
              {lead.utm_source && (
                <div>
                  <dt className="text-gray-400">Traffic source</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">
                    {[lead.utm_source, lead.utm_medium, lead.utm_campaign]
                      .filter(Boolean)
                      .join(" / ")}
                  </dd>
                </div>
              )}
              {lead.utm_content && (
                <div>
                  <dt className="text-gray-400">Ad content</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{lead.utm_content}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Timeline: status changes + contact activity */}
          {timeline.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Timeline
              </h2>
              <ol className="space-y-3">
                {timeline.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
                    <div>
                      <span className="text-gray-700 font-medium">{entry.text}</span>
                      {entry.sub && (
                        <p className="text-gray-400 text-xs mt-0.5">{entry.sub}</p>
                      )}
                      <p className="text-gray-300 text-xs mt-0.5">
                        {new Date(entry.created_at).toLocaleString("en-NG", {
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
        <div className="space-y-4 h-fit">
          {(canChangeStatus || canEditNotes) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <LeadActions
                leadId={lead.id}
                currentStatus={status}
                callNotes={lead.call_notes}
                canChangeStatus={canChangeStatus}
                canEditNotes={canEditNotes}
              />
            </div>
          )}
          {canEditNotes && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <FollowUpPanel
                leadId={lead.id}
                followUpAt={lead.follow_up_at}
                lastContactedAt={lead.last_contacted_at}
                actorName={staff.fullName}
              />
            </div>
          )}
          {canAssign && assignableStaff && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <AssignLead
                leadId={lead.id}
                assignedTo={lead.assigned_to}
                staff={assignableStaff}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
