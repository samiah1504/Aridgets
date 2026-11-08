// Plain-text summary of an order for the "Copy order" button: ready to paste
// into WhatsApp for a rider or logistics partner. Contact details are left
// out for staff who may not see them.

import { formatNGN } from "@/lib/utils/currency";
import { formatDeliveryDate } from "@/lib/purchaseOptions";
import { STATUS_LABELS } from "@/lib/leadStatus";
import type { LeadStatus, PurchaseOptionSnapshot, DeliveryPreference } from "@/types";

export interface OrderTextInput {
  order_number: string;
  created_at: string;
  status: string;
  name: string;
  phone: string;
  state: string;
  city: string | null;
  address: string;
  quantity: number;
  unit_price: number;
  total: number;
  amount_paid: number;
  purchase_option: PurchaseOptionSnapshot | null;
  selected_options: Record<string, string> | null;
  delivery_preference: DeliveryPreference | null;
  delivery_date: string | null;
  productName: string | null;
}

/** +2348031234567 → 08031234567 (the format riders dial) */
function localPhone(phone: string): string {
  const m = /^\+234(\d{10})$/.exec(phone.replace(/\s+/g, ""));
  return m ? `0${m[1]}` : phone;
}

export function formatOrderText(o: OrderTextInput, { includeContact }: { includeContact: boolean }): string {
  const date = new Date(o.created_at).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
  const lines: string[] = [`ORDER ${o.order_number}`, `Date: ${date}`, `Status: ${STATUS_LABELS[o.status as LeadStatus] ?? o.status}`, ""];

  lines.push(`Customer: ${o.name}`);
  if (includeContact) {
    lines.push(`Phone: ${localPhone(o.phone)}`);
    lines.push(`Address: ${[o.address, o.city, `${o.state} State`].filter(Boolean).join(", ")}`);
  } else {
    lines.push(`Location: ${[o.city, `${o.state} State`].filter(Boolean).join(", ")}`);
  }
  if (o.delivery_preference) {
    lines.push(
      `Delivery: ${
        o.delivery_preference === "date" && o.delivery_date
          ? `Preferred date ${formatDeliveryDate(o.delivery_date)}`
          : "As soon as possible"
      }`
    );
  }
  lines.push("");

  lines.push(`Product: ${o.productName ?? "—"}`);
  if (o.purchase_option) {
    lines.push(`Option: ${o.purchase_option.name}`);
    if (o.purchase_option.includes.length) lines.push(`Includes: ${o.purchase_option.includes.join(", ")}`);
  }
  const variant = Object.entries(o.selected_options ?? {});
  if (variant.length) lines.push(`Variant: ${variant.map(([k, v]) => `${k}: ${v}`).join(", ")}`);
  lines.push(`Quantity: ${o.quantity} × ${formatNGN(o.unit_price)}`);
  lines.push(`Total: ${formatNGN(o.total)}`);

  const outstanding = Math.max(o.total - o.amount_paid, 0);
  if (outstanding === 0) {
    lines.push("Payment: Paid in full — nothing to collect");
  } else if (o.amount_paid > 0) {
    lines.push(`Paid: ${formatNGN(o.amount_paid)}`);
    lines.push(`Amount to collect: ${formatNGN(outstanding)}`);
  } else {
    lines.push(`Amount to collect: ${formatNGN(outstanding)} (pay on delivery)`);
  }

  return lines.join("\n");
}
