// Shared rules for configurable purchasing options and delivery preference.
// Used by the admin editor (validation before save/publish), the order form
// (display + live totals) and /api/leads (authoritative pricing) so the three
// can never disagree.

import type {
  DeliveryPreferenceSettings,
  ProductContent,
  PurchaseOption,
  PurchaseOptionSnapshot,
  TemplateType,
} from "@/types";

const MAX_DELIVERY_DAYS_AHEAD = 365;

// System-level order safeguards (not configurable per option). Quantity always
// starts at 1. leads.total and products.price are Postgres integers, so an
// order total must stay well below 2,147,483,647.
export const MIN_ORDER_QTY = 1;
export const MAX_ORDER_QTY = 999;
export const MAX_ORDER_TOTAL = 2_000_000_000;

/** Largest quantity allowed for a unit price, under both safeguards. */
export function maxOrderQuantity(unitPrice: number): number {
  if (!(unitPrice > 0)) return MAX_ORDER_QTY;
  return Math.max(MIN_ORDER_QTY, Math.min(MAX_ORDER_QTY, Math.floor(MAX_ORDER_TOTAL / unitPrice)));
}

export function activePurchaseOptions(content: ProductContent | null | undefined): PurchaseOption[] {
  return (content?.purchaseOptions ?? []).filter((o) => o.active);
}

export function lowestPrice(options: PurchaseOption[]): number | null {
  return options.length ? Math.min(...options.map((o) => o.price)) : null;
}

export function toSnapshot(option: PurchaseOption): PurchaseOptionSnapshot {
  return {
    id: option.id,
    name: option.name,
    description: option.description?.trim() || null,
    includes: option.includes ?? [],
    unit_price: option.price,
  };
}

/** Field problems that must be fixed before the options can be saved. */
export function validatePurchaseOptions(options: PurchaseOption[]): string[] {
  const errors: string[] = [];
  options.forEach((o, i) => {
    const label = `Option ${i + 1}${o.name.trim() ? ` (${o.name.trim()})` : ""}`;
    if (!o.name.trim()) errors.push(`${label}: enter an option name`);
    if (!Number.isInteger(o.price) || o.price <= 0) {
      errors.push(`${label}: enter a price in whole naira, above ₦0`);
    } else if (o.price > MAX_ORDER_TOTAL) {
      errors.push(`${label}: price is too large`);
    }
  });
  return errors;
}

/**
 * A live page must offer at least one option, otherwise nobody can order.
 * Returns why saving is blocked, or null.
 */
export function liveWithoutAvailableOption(
  options: PurchaseOption[],
  status: string
): "no_options" | "none_available" | null {
  if (status !== "live") return null;
  if (options.length === 0) return "no_options";
  return options.some((o) => o.active) ? null : "none_available";
}

/** Option data as saved: trimmed, with retired per-option quantity limits removed. */
export function cleanPurchaseOption(o: PurchaseOption): PurchaseOption {
  const clean: PurchaseOption = {
    ...o,
    name: o.name.trim(),
    description: o.description?.trim() || undefined,
  };
  delete clean.minQty;
  delete clean.maxQty;
  return clean;
}

// ── Delivery preference ─────────────────────────────────────────────────────

export interface DeliverySettings {
  enabled: boolean;
  label: string;
  asapLabel: string;
  dateLabel: string;
}

export const DELIVERY_DEFAULTS = {
  label: "When do you want it delivered?",
  asapLabel: "As soon as possible",
  dateLabel: "Choose a delivery date",
} as const;

export function resolveDeliverySettings(
  content: ProductContent | null | undefined,
  templateType: TemplateType | string | null | undefined
): DeliverySettings {
  const s: DeliveryPreferenceSettings = content?.deliveryPreference ?? {};
  return {
    enabled: s.enabled ?? templateType === "options_bundles",
    label: s.label?.trim() || DELIVERY_DEFAULTS.label,
    asapLabel: s.asapLabel?.trim() || DELIVERY_DEFAULTS.asapLabel,
    dateLabel: s.dateLabel?.trim() || DELIVERY_DEFAULTS.dateLabel,
  };
}

/** Today's date in Nigeria as YYYY-MM-DD (customers and server agree on "today"). */
export function todayInLagos(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function latestDeliveryDate(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + MAX_DELIVERY_DAYS_AHEAD);
  return d.toISOString().slice(0, 10);
}

/** Returns an error message, or null when the date is acceptable. */
export function validateDeliveryDate(value: unknown, today: string = todayInLagos()): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Please choose a delivery date";
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return "Please choose a valid delivery date";
  }
  if (value < today) return "The delivery date cannot be in the past";
  if (value > latestDeliveryDate(today)) return "Please choose a date within the next 12 months";
  return null;
}

export function formatDeliveryDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
