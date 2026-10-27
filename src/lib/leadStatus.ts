// Single source for order (lead) statuses: labels, badge colours and order.
import type { LeadStatus } from "@/types";

export const LEAD_STATUSES: { value: LeadStatus; label: string; badge: string; bar: string }[] = [
  { value: "new", label: "New Lead", badge: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-500" },
  { value: "confirmed", label: "Confirmed", badge: "bg-green-100 text-green-700", bar: "bg-green-500" },
  { value: "delivered", label: "Delivered", badge: "bg-blue-100 text-blue-700", bar: "bg-blue-500" },
  { value: "paid", label: "Paid", badge: "bg-emerald-600 text-white", bar: "bg-emerald-600" },
  { value: "not_buying", label: "Not Buying", badge: "bg-red-100 text-red-700", bar: "bg-red-400" },
  { value: "cancelled", label: "Cancelled", badge: "bg-gray-200 text-gray-600", bar: "bg-gray-400" },
  { value: "not_picking_calls", label: "Not Picking Calls", badge: "bg-gray-100 text-gray-500", bar: "bg-gray-300" },
];

export const STATUS_LABELS = Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, s.label])) as Record<LeadStatus, string>;
export const STATUS_BADGE = Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, s.badge])) as Record<LeadStatus, string>;

export const DROP_STATUSES: LeadStatus[] = ["not_buying", "cancelled", "not_picking_calls"];

export const PURCHASE_EVENT_LABELS = {
  pending: { label: "Purchase event pending", badge: "bg-yellow-100 text-yellow-800" },
  sent: { label: "Purchase sent to Meta", badge: "bg-green-100 text-green-700" },
  failed: { label: "Purchase event failed", badge: "bg-red-100 text-red-700" },
} as const;
