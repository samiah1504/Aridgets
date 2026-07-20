"use client";

import { useState, useEffect, useCallback } from "react";
import { NIGERIAN_STATES } from "@/lib/constants/states";
import { SERIOUS_BUYER_DEFAULTS } from "@/lib/config";
import { getTrackingSession, beacon } from "@/components/MetaPixel";
import { formatNGN } from "@/lib/utils/currency";
import { isValidNGPhone } from "@/lib/utils/phone";
import type { ProductOption, ProductVariant, SeriousBuyerNotice } from "@/types";

export interface VariantAwareOrderFormProps {
  productId: string;
  productName: string;
  basePrice: number;
  compareAtPrice?: number | null;
  title?: string;
  successHeadline?: string;
  successBody?: string;
  ctaText?: string;
  pixelId?: string;
  fbclid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  options: ProductOption[];
  variants: ProductVariant[];
  primaryColor: string;
  notice?: SeriousBuyerNotice;
}

interface SuccessData {
  order_number: string;
  total: number;
  name: string;
  event_id_lead: string;
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find((r) => r.startsWith(name + "="));
  return match ? match.split("=")[1] : undefined;
}

function findVariant(
  variants: ProductVariant[],
  selected: Record<string, string>
): ProductVariant | null {
  const selectedIds = Object.values(selected);
  if (!selectedIds.length) return null;
  return (
    variants.find(
      (v) =>
        v.active &&
        v.option_value_ids.length === selectedIds.length &&
        selectedIds.every((id) => v.option_value_ids.includes(id))
    ) ?? null
  );
}

function isOutOfStock(v: ProductVariant | null): boolean {
  return v !== null && v.stock_quantity !== null && v.stock_quantity <= 0;
}

export default function VariantAwareOrderForm({
  productId,
  productName,
  basePrice,
  compareAtPrice,
  title,
  successHeadline,
  successBody,
  ctaText,
  pixelId,
  fbclid,
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
  options,
  variants,
  primaryColor,
  notice,
}: VariantAwareOrderFormProps) {
  const noticeEnabled = notice?.enabled !== false;
  const noticeRequired = noticeEnabled && notice?.required !== false;
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [buyerConfirmed, setBuyerConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [apiError, setApiError] = useState("");
  const [fbp, setFbp] = useState<string | undefined>();
  const [fbc, setFbc] = useState<string | undefined>();
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setFbp(getCookie("_fbp"));
      setFbc(getCookie("_fbc"));
      setTestMode(getTrackingSession().test);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeOptions = options.filter((o) => o.values.some((v) => v.active));
  const matchedVariant = activeOptions.length > 0 ? findVariant(variants, selectedValues) : null;

  const hasAllRequired = activeOptions.every(
    (o) => !o.required || !!selectedValues[o.id]
  );

  const effectivePrice =
    matchedVariant?.price_override ?? basePrice;
  const effectiveCompareAt =
    matchedVariant?.compare_at_price_override ?? compareAtPrice ?? null;
  const total = effectivePrice * quantity;

  const outOfStock = isOutOfStock(matchedVariant);

  function selectValue(optionId: string, valueId: string) {
    setSelectedValues((prev) => {
      const next = { ...prev, [optionId]: valueId };
      return next;
    });
  }

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    activeOptions.forEach((o) => {
      if (o.required && !selectedValues[o.id]) {
        e[`option_${o.id}`] = `Please choose a ${o.name.toLowerCase()}`;
      }
    });
    if (!name.trim()) e.name = "Full name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    else if (!isValidNGPhone(phone)) e.phone = "Enter a valid Nigerian phone number";
    if (!state) e.state = "Please select your state";
    if (!address.trim()) e.address = "Delivery address is required";
    if (noticeRequired && !buyerConfirmed) {
      e.buyerConfirmed = "Please tick the confirmation box to place your order";
    }
    return e;
  }, [activeOptions, selectedValues, name, phone, state, address, noticeRequired, buyerConfirmed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const selectedOptions: Record<string, string> = {};
    activeOptions.forEach((o) => {
      const valueId = selectedValues[o.id];
      if (valueId) {
        const val = o.values.find((v) => v.id === valueId);
        if (val) selectedOptions[o.name] = val.value;
      }
    });

    const tracking = getTrackingSession();

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          session_id: tracking.sessionId,
          is_test: tracking.test,
          name: name.trim(),
          phone: phone.trim(),
          state,
          city: city.trim() || undefined,
          address: address.trim(),
          quantity,
          fbp, fbc, fbclid,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_content: utmContent,
          variant_id: matchedVariant?.id ?? undefined,
          selected_options: Object.keys(selectedOptions).length ? selectedOptions : undefined,
          buyer_confirmed: noticeEnabled ? buyerConfirmed : undefined,
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "Something went wrong. Please try again.";
        setApiError(msg);
        return;
      }

      const result = data as SuccessData;
      setSuccess(result);

      if (pixelId && typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq(
          "track", "Lead",
          { value: result.total, currency: "NGN" },
          { eventID: result.event_id_lead }
        );
      }

      // Report the browser-side Lead event to the Tracking Center
      beacon({
        product_id: productId,
        event_name: "Lead",
        event_id: result.event_id_lead,
        session_id: tracking.sessionId,
        test: tracking.test,
        pixel_loaded:
          typeof window !== "undefined" &&
          typeof window.fbq === "function" &&
          !!window.fbq.callMethod,
      });

      document.getElementById("order")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const body = (successBody ?? "Thank you! We will call you to confirm your order.")
      .replace("{total}", formatNGN(success.total));
    return (
      <section id="order" className="px-4 py-10 max-w-lg mx-auto">
        <div className="rounded-2xl p-8 text-center text-white" style={{ backgroundColor: primaryColor }}>
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-extrabold mb-3">{successHeadline ?? "Order Received!"}</h2>
          <p className="text-base opacity-90 leading-relaxed mb-4">{body}</p>
          <p className="text-sm opacity-75">
            Order number: <span className="font-bold">{success.order_number}</span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="order" className="px-4 py-10 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 text-white" style={{ backgroundColor: primaryColor }}>
          <h2 className="text-xl font-extrabold">
            {title ?? `Order ${productName} — Pay on Delivery`}
          </h2>
          <p className="text-sm opacity-80 mt-1">Fill the form below. We call to confirm before delivery.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-6 space-y-5">
          {testMode && (
            <div className="rounded-xl bg-orange-100 border border-orange-300 px-4 py-2.5 text-xs font-bold text-orange-800 text-center">
              🧪 TEST MODE — this order will be tagged as a test lead
            </div>
          )}

          {/* Serious Buyers notice */}
          {noticeEnabled && (
            <div
              className={`rounded-xl border px-4 py-4 ${
                errors.buyerConfirmed
                  ? "border-red-300 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span aria-hidden>⚠️</span>
                {notice?.heading || SERIOUS_BUYER_DEFAULTS.heading}
              </p>
              <p className="text-xs text-amber-800 leading-relaxed mt-1.5">
                {notice?.message || SERIOUS_BUYER_DEFAULTS.message}
              </p>
              <label className="flex items-start gap-2.5 mt-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={buyerConfirmed}
                  onChange={(e) => setBuyerConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0"
                />
                <span className="text-xs font-medium text-amber-900 leading-snug">
                  {notice?.checkboxText || SERIOUS_BUYER_DEFAULTS.checkboxText}
                  {noticeRequired && <span className="text-red-500 ml-1">*</span>}
                </span>
              </label>
              {errors.buyerConfirmed && (
                <p className="text-xs text-red-600 mt-2">{errors.buyerConfirmed}</p>
              )}
            </div>
          )}

          {/* Standard form fields */}
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-name">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="of-name" type="text" autoComplete="name"
              autoCorrect="off" autoCapitalize="words" spellCheck={false}
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amaka Johnson"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition ${
                errors.name ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-indigo-300 focus:border-indigo-500"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-phone">
              WhatsApp / Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="of-phone" type="tel" autoComplete="tel" inputMode="tel"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition ${
                errors.phone ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-indigo-300 focus:border-indigo-500"
              }`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-state">
              State <span className="text-red-500">*</span>
            </label>
            <select
              id="of-state" value={state}
              onChange={(e) => setState(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 bg-white transition ${
                errors.state ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-indigo-300 focus:border-indigo-500"
              }`}
            >
              <option value="">— Select State —</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-city">
              City / Town <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="of-city" type="text" autoComplete="address-level2"
              autoCorrect="off" autoCapitalize="words" spellCheck={false}
              value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ikeja"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-address">
              Delivery Address <span className="text-red-500">*</span>
            </label>
            <textarea
              id="of-address" rows={3}
              autoCorrect="off" autoCapitalize="sentences" spellCheck={false}
              value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="House number, street, nearest landmark"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition resize-none ${
                errors.address ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-indigo-300 focus:border-indigo-500"
              }`}
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          {/* Variant selectors */}
          {activeOptions.map((option) => {
            const activeVals = option.values.filter((v) => v.active);
            const err = errors[`option_${option.id}`];
            return (
              <div key={option.id}>
                <label className="block text-sm font-semibold mb-2">
                  {option.name}
                  {option.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {option.display_type === "colour_swatch" ? (
                  <div className="flex flex-wrap gap-3">
                    {activeVals.map((val) => {
                      const selected = selectedValues[option.id] === val.id;
                      return (
                        <button
                          key={val.id}
                          type="button"
                          title={val.value}
                          onClick={() => selectValue(option.id, val.id)}
                          className={`flex flex-col items-center gap-1 transition`}
                        >
                          <span
                            className={`w-9 h-9 rounded-full border-2 transition-transform ${
                              selected ? "border-gray-900 scale-110" : "border-gray-200 hover:border-gray-400"
                            }`}
                            style={{ backgroundColor: val.colour_hex ?? "#ccc" }}
                          />
                          <span className="text-xs text-gray-500">{val.value}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : option.display_type === "dropdown" ? (
                  <select
                    value={selectedValues[option.id] ?? ""}
                    onChange={(e) => selectValue(option.id, e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 bg-white transition ${
                      err ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-indigo-300 focus:border-indigo-500"
                    }`}
                  >
                    <option value="">— Choose {option.name} —</option>
                    {activeVals.map((val) => (
                      <option key={val.id} value={val.id}>{val.value}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeVals.map((val) => {
                      const selected = selectedValues[option.id] === val.id;
                      return (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() => selectValue(option.id, val.id)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                            selected
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 hover:border-gray-400 text-gray-700"
                          }`}
                        >
                          {val.value}
                        </button>
                      );
                    })}
                  </div>
                )}
                {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
              </div>
            );
          })}

          {/* Show variant image if available */}
          {matchedVariant?.image_url && (
            <div className="rounded-xl overflow-hidden border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={matchedVariant.image_url} alt="" className="w-full object-cover max-h-48" />
            </div>
          )}

          {/* Price display (updates with variant) */}
          {activeOptions.length > 0 && (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">{formatNGN(effectivePrice)}</span>
              {effectiveCompareAt && effectiveCompareAt > effectivePrice && (
                <span className="text-base text-gray-400 line-through">{formatNGN(effectiveCompareAt)}</span>
              )}
              {outOfStock && (
                <span className="text-sm text-red-500 font-medium">Out of stock</span>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Quantity</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border border-gray-200 text-xl font-bold flex items-center justify-center active:bg-gray-100 transition">−</button>
              <span className="text-xl font-bold w-6 text-center">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="w-10 h-10 rounded-full border border-gray-200 text-xl font-bold flex items-center justify-center active:bg-gray-100 transition">+</button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">{productName} × {quantity}</span>
              <span className="font-semibold">{formatNGN(total)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 mt-2">
              <span>Total (Pay on delivery)</span>
              <span style={{ color: primaryColor }}>{formatNGN(total)}</span>
            </div>
          </div>

          {apiError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || outOfStock || (activeOptions.length > 0 && !hasAllRequired)}
            className="w-full text-white font-extrabold text-lg py-4 rounded-2xl shadow-md active:scale-95 transition-all disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? "Placing order…"
              : outOfStock ? "Out of Stock"
              : (ctaText ?? "Order Now — Pay on Delivery")}
          </button>

          <p className="text-center text-xs text-gray-400">
            No online payment. You pay cash only when the rider delivers.
          </p>
        </form>
      </div>
    </section>
  );
}
