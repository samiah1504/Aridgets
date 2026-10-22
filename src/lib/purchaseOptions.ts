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

export const DEFAULT_MIN_QTY = 1;
export const DEFAULT_MAX_QTY = 20;
const MAX_QTY_LIMIT = 100;
const MAX_DELIVERY_DAYS_AHEAD = 365;

export function quantityBounds(option: PurchaseOption): { min: number; max: number } {
  const min = option.minQty && option.minQty > 0 ? option.minQty : DEFAULT_MIN_QTY;
  const max = option.maxQty && option.maxQty > 0 ? option.maxQty : DEFAULT_MAX_QTY;
  return { min, max: Math.max(min, max) };
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

/**
 * Problems that must be fixed before the options can be saved.
 * `publishing` adds the rule that a live page needs at least one active option.
 */
export function validatePurchaseOptions(
  options: PurchaseOption[],
  { publishing }: { publishing: boolean }
): string[] {
  const errors: string[] = [];
  options.forEach((o, i) => {
    const label = `Option ${i + 1}${o.name.trim() ? ` (${o.name.trim()})` : ""}`;
    if (!o.name.trim()) errors.push(`${label}: name is required`);
    if (!Number.isInteger(o.price) || o.price <= 0) {
      errors.push(`${label}: price must be a whole naira amount above 0`);
    }
    const { minQty, maxQty } = o;
    if (minQty !== undefined && (!Number.isInteger(minQty) || minQty < 1 || minQty > MAX_QTY_LIMIT)) {
      errors.push(`${label}: minimum quantity must be a whole number from 1 to ${MAX_QTY_LIMIT}`);
    }
    if (maxQty !== undefined && (!Number.isInteger(maxQty) || maxQty < 1 || maxQty > MAX_QTY_LIMIT)) {
      errors.push(`${label}: maximum quantity must be a whole number from 1 to ${MAX_QTY_LIMIT}`);
    }
    if (minQty !== undefined && maxQty !== undefined && minQty > maxQty) {
      errors.push(`${label}: minimum quantity cannot be more than the maximum`);
    }
  });
  if (publishing && !options.some((o) => o.active)) {
    errors.push("Add at least one active option before publishing this page");
  }
  return errors;
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
