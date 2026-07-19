import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePerm } from "@/lib/auth";

export const metadata: Metadata = { title: "Audit Log" };

const ACTION_LABELS: Record<string, string> = {
  "product.created": "created product",
  "product.deleted": "deleted product",
  "product.status_changed": "changed product status",
  "lead.status_changed": "changed lead status",
  "lead.assigned": "assigned lead",
  "staff.created": "created staff account",
  "staff.deleted": "deleted staff account",
  "staff.role_changed": "changed staff role",
  "staff.activated": "activated staff account",
  "staff.deactivated": "deactivated staff account",
};

function describe(action: string, detail: Record<string, unknown> | null): string {
  const label = ACTION_LABELS[action] ?? action;
  if (!detail) return label;
  const name = (detail.name ?? detail.order_number ?? detail.email ?? "") as string;
  const from = detail.from as string | undefined;
  const to = detail.to as string | undefined;
  let text = name ? `${label} — ${name}` : label;
  if (from && to) text += ` (${from} → ${to})`;
  return text;
}

export default async function AuditPage() {
  await requirePerm("audit.view");
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, detail, ip, created_at, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Audit Log</h1>

      {!entries?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          No activity recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Who</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((entry) => {
                  const user = entry.profiles as { full_name: string | null; email: string | null } | null;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {user?.full_name ?? user?.email ?? "System"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {describe(entry.action, entry.detail as Record<string, unknown> | null)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{entry.ip ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString("en-NG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
