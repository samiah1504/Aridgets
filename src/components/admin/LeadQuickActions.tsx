"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ContactButtons from "./ContactButtons";
import { LEAD_STATUSES } from "@/lib/leadStatus";
import type { LeadStatus } from "@/types";

interface Props {
  leadId: string;
  /** null when the viewer lacks permission to see contact info */
  phone: string | null;
  customerName: string;
  productName: string;
  total: number;
  status: LeadStatus;
  canChangeStatus: boolean;
  actorName: string | null;
}

// "Paid" is only reached by recording a payment on the order page, so it is
// listed only to display an order that is already paid.
const STATUS_OPTIONS = LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }));

export default function LeadQuickActions({
  leadId,
  phone,
  customerName,
  productName,
  total,
  status,
  canChangeStatus,
  actorName,
}: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  async function changeStatus(newStatus: string) {
    if (newStatus === status) return;
    setUpdating(true);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Could not update the status.");
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {phone && (
        <ContactButtons
          leadId={leadId}
          phone={phone}
          customerName={customerName}
          productName={productName}
          total={total}
          actorName={actorName}
          compact
        />
      )}
      {canChangeStatus && (
        <select
          value={status}
          disabled={updating}
          onChange={(e) => changeStatus(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs border border-gray-200 rounded-lg px-1.5 py-1.5 bg-white text-gray-600 outline-none disabled:opacity-50"
          title="Change status"
        >
          {STATUS_OPTIONS.filter((o) => o.value !== "paid" || status === "paid").map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      <Link
        href={`/admin/leads/${leadId}`}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition whitespace-nowrap"
      >
        View →
      </Link>
    </div>
  );
}
