// Order & revenue analytics. Pure functions over order rows, so the rules
// are testable and identical for the summary and the per-product table.
//
// Rules (shown on the Analytics page):
// - An order belongs to the period in which it was RECEIVED (created_at, Lagos
//   time). Every metric — including money collected — is about those orders.
// - Each order counts once. Milestones come from the order's timestamps and
//   current status, never from status-history rows.
// - Test orders are excluded by the caller.

import type { LeadStatus } from "@/types";
import type { PurchaseEventStatus } from "@/types/database";

export interface AnalyticsOrder {
  product_id: string | null;
  status: LeadStatus;
  total: number;
  amount_paid: number;
  confirmed_at: string | null;
  delivered_at: string | null;
  purchase_event_status: PurchaseEventStatus | null;
}

export interface Metrics {
  orders: number;
  confirmed: number;
  delivered: number;
  paid: number;
  cancelled: number;
  notBuying: number;
  notPickingCalls: number;
  orderValue: number;
  collected: number;
  outstanding: number;
  paidValue: number;
  purchaseSent: number;
  purchasePendingOrFailed: number;
}

/** Reached confirmation at any point (later stages imply it). */
export const isConfirmed = (o: AnalyticsOrder) =>
  !!o.confirmed_at || o.status === "confirmed" || o.status === "delivered" || o.status === "paid";

/** Payments cover the order total. */
export const isPaid = (o: AnalyticsOrder) => o.total > 0 && o.amount_paid >= o.total;

/** Delivered, or paid (orders are pay-on-delivery, so payment implies delivery). */
export const isDelivered = (o: AnalyticsOrder) => !!o.delivered_at || o.status === "delivered" || isPaid(o);

/** Committed orders still owed money (confirmed or later, not dropped). */
const owes = (o: AnalyticsOrder) =>
  (o.status === "confirmed" || o.status === "delivered" || o.status === "paid") && o.amount_paid < o.total;

export function computeMetrics(orders: AnalyticsOrder[]): Metrics {
  const m: Metrics = {
    orders: 0, confirmed: 0, delivered: 0, paid: 0, cancelled: 0, notBuying: 0, notPickingCalls: 0,
    orderValue: 0, collected: 0, outstanding: 0, paidValue: 0, purchaseSent: 0, purchasePendingOrFailed: 0,
  };
  for (const o of orders) {
    m.orders++;
    if (isConfirmed(o)) m.confirmed++;
    if (isDelivered(o)) m.delivered++;
    if (isPaid(o)) { m.paid++; m.paidValue += o.amount_paid; }
    if (o.status === "cancelled") m.cancelled++;
    if (o.status === "not_buying") m.notBuying++;
    if (o.status === "not_picking_calls") m.notPickingCalls++;
    m.orderValue += o.total;
    m.collected += o.amount_paid;
    if (owes(o)) m.outstanding += o.total - o.amount_paid;
    if (o.purchase_event_status === "sent") m.purchaseSent++;
    if (o.purchase_event_status === "pending" || o.purchase_event_status === "failed") m.purchasePendingOrFailed++;
  }
  return m;
}

export const rate = (part: number, whole: number) => (whole > 0 ? part / whole : null);

export function byProduct(orders: AnalyticsOrder[]): Map<string | null, Metrics> {
  const groups = new Map<string | null, AnalyticsOrder[]>();
  for (const o of orders) {
    const list = groups.get(o.product_id) ?? [];
    list.push(o);
    groups.set(o.product_id, list);
  }
  return new Map([...groups].map(([k, list]) => [k, computeMetrics(list)]));
}

// ── Date range (Africa/Lagos is UTC+1 all year, no daylight saving) ─────────

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function lagosDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d);
}

/** Validated from/to (inclusive Lagos days) with a 30-day default. */
export function resolveRange(from?: string, to?: string): { from: string; to: string; startIso: string; endIso: string } {
  const today = lagosDate(new Date());
  const defaultFrom = lagosDate(new Date(Date.now() - 29 * 86400_000));
  let f = from && DAY.test(from) ? from : defaultFrom;
  let t = to && DAY.test(to) ? to : today;
  if (f > t) [f, t] = [t, f];
  return { from: f, to: t, startIso: `${f}T00:00:00+01:00`, endIso: `${t}T23:59:59.999+01:00` };
}

/** Preset ranges for the date filter (Lagos days). */
export function quickRanges(now: Date = new Date()) {
  const today = lagosDate(now);
  const daysAgo = (n: number) => lagosDate(new Date(now.getTime() - n * 86400_000));
  return {
    today,
    quick: [
      { label: "Today", from: today, to: today },
      { label: "Last 7 days", from: daysAgo(6), to: today },
      { label: "Last 30 days", from: daysAgo(29), to: today },
      { label: "This month", from: `${today.slice(0, 8)}01`, to: today },
    ],
  };
}
