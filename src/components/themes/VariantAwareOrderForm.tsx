"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { NIGERIAN_STATES } from "@/lib/constants/states";
import { SERIOUS_BUYER_DEFAULTS } from "@/lib/config";
import { getTrackingSession, beacon } from "@/components/MetaPixel";
import { formatNGN } from "@/lib/utils/currency";
import { isValidNGPhone } from "@/lib/utils/phone";
import { CHOOSE_OPTION_EVENT } from "@/components/sections/OrderCta";
import {
  formatDeliveryDate,
  latestDeliveryDate,
  MIN_ORDER_QTY,
  maxOrderQuantity,
  validateDeliveryDate,
  type DeliverySettings,
} from "@/lib/purchaseOptions";
import type {
  DeliveryPreference,
  ProductOption,
  ProductVariant,
  PurchaseOption,
  SeriousBuyerNotice,
} from "@/types";

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
  /** @deprecated Colours come from the page theme tokens (sp-* classes) */
  primaryColor?: string;
  notice?: SeriousBuyerNotice;
  /** Active purchasing options — when present the customer picks exactly one */
  purchaseOptions?: PurchaseOption[];
  purchaseOptionsHeading?: string;
  delivery?: DeliverySettings;
  /** Today's date in Nigeria (YYYY-MM-DD), computed on the server */
  today?: string;
  /** Admin theme preview: fully interactive, but never submits an order */
  preview?: boolean;
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
  notice,
  purchaseOptions,
  purchaseOptionsHeading,
  delivery,
  today,
  preview,
}: VariantAwareOrderFormProps) {
  const optionsMode = !!purchaseOptions?.length;
  const deliveryEnabled = !!delivery?.enabled && !!today;
  const noticeEnabled = notice?.enabled !== false;
  const noticeRequired = noticeEnabled && notice?.required !== false;
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [quantity, setQuantity] = useState(1);
  // Typed text of the options quantity box (may be briefly empty while editing)
  const [qtyText, setQtyText] = useState("1");
  const [buyerConfirmed, setBuyerConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [apiError, setApiError] = useState("");
  const [fbp, setFbp] = useState<string | undefined>();
  const [fbc, setFbc] = useState<string | undefined>();
  const [testMode, setTestMode] = useState(false);
  // A single option needs no choice — preselect it
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    purchaseOptions?.length === 1 ? purchaseOptions[0].id : null
  );
  const [deliveryPref, setDeliveryPref] = useState<DeliveryPreference>("asap");
  const [deliveryDate, setDeliveryDate] = useState("");

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

  // Variations (colour/size) do not apply when purchasing options are in use
  const activeOptions = useMemo(
    () => (optionsMode ? [] : options.filter((o) => o.values.some((v) => v.active))),
    [optionsMode, options]
  );
  const matchedVariant = activeOptions.length > 0 ? findVariant(variants, selectedValues) : null;

  const hasAllRequired = activeOptions.every(
    (o) => !o.required || !!selectedValues[o.id]
  );

  const selectedOption = optionsMode
    ? purchaseOptions!.find((o) => o.id === selectedOptionId) ?? null
    : null;

  const effectivePrice =
    selectedOption?.price ?? matchedVariant?.price_override ?? basePrice;
  const effectiveCompareAt =
    matchedVariant?.compare_at_price_override ?? compareAtPrice ?? null;
  const total = effectivePrice * quantity;

  const outOfStock = isOutOfStock(matchedVariant);

  function choosePurchaseOption(option: PurchaseOption) {
    if (option.id === selectedOptionId) return;
    setSelectedOptionId(option.id);
    // Start each option at its own minimum quantity
    setQuantity(MIN_ORDER_QTY);
    setQtyText(String(MIN_ORDER_QTY));
    setErrors((e) => ({ ...e, purchaseOption: "" }));
  }

  // An option tapped in an order block higher up the page is pre-selected here
  useEffect(() => {
    if (!purchaseOptions?.length) return;
    const onChoose = (e: Event) => {
      const id = (e as CustomEvent<{ optionId: string }>).detail?.optionId;
      const option = purchaseOptions.find((o) => o.id === id);
      if (!option) return;
      setErrors((prev) => ({ ...prev, purchaseOption: "" }));
      if (option.id === selectedOptionId) return;
      setSelectedOptionId(option.id);
      setQuantity(MIN_ORDER_QTY);
      setQtyText(String(MIN_ORDER_QTY));
    };
    window.addEventListener(CHOOSE_OPTION_EVENT, onChoose);
    return () => window.removeEventListener(CHOOSE_OPTION_EVENT, onChoose);
  }, [purchaseOptions, selectedOptionId]);

  function changeOptionQuantity(next: number, maxQty: number) {
    const q = Math.min(maxQty, Math.max(MIN_ORDER_QTY, next));
    setQuantity(q);
    setQtyText(String(q));
  }

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
    if (optionsMode && !selectedOption) e.purchaseOption = "Please choose an option";
    if (deliveryEnabled && deliveryPref === "date") {
      const dateError = validateDeliveryDate(deliveryDate, today);
      if (dateError) e.deliveryDate = dateError;
    }
    if (!name.trim()) e.name = "Full name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    else if (!isValidNGPhone(phone)) e.phone = "Enter a valid Nigerian phone number";
    if (!state) e.state = "Please select your state";
    if (!address.trim()) e.address = "Delivery address is required";
    if (noticeRequired && !buyerConfirmed) {
      e.buyerConfirmed = "Please tick the confirmation box to place your order";
    }
    return e;
  }, [activeOptions, selectedValues, optionsMode, selectedOption, deliveryEnabled, deliveryPref, deliveryDate, today, name, phone, state, address, noticeRequired, buyerConfirmed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");
    if (preview) {
      setApiError("This is a preview — orders can't be placed from here.");
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.purchaseOption) {
        document.getElementById("order-options")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
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
          variant_id: optionsMode ? undefined : matchedVariant?.id ?? undefined,
          ...(selectedOption && {
            purchase_option_id: selectedOption.id,
            // Sent only so the server can reject a stale or tampered price —
            // the server always charges the saved option price.
            expected_unit_price: selectedOption.price,
            expected_total: selectedOption.price * quantity,
          }),
          ...(deliveryEnabled && {
            delivery_preference: deliveryPref,
            delivery_date: deliveryPref === "date" ? deliveryDate : undefined,
          }),
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
      <section id="order" className="px-4 sp-section max-w-lg mx-auto">
        <div className="sp-on-primary sp-rounded p-8 text-center">
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
    <section id="order" className="px-4 sp-section max-w-lg mx-auto">
      <div className="sp-card overflow-hidden">
        <div className="px-6 py-5 sp-on-primary">
          <h2 className="text-xl font-extrabold">
            {title ?? `Order ${productName} — Pay on Delivery`}
          </h2>
          <p className="text-sm opacity-80 mt-1">Fill the form below. We call to confirm before delivery.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-4 sm:px-6 py-6 space-y-5">
          {testMode && (
            <div className="sp-rounded bg-orange-100 border border-orange-300 px-4 py-2.5 text-xs font-bold text-orange-800 text-center">
              🧪 TEST MODE — this order will be tagged as a test lead
            </div>
          )}

          {/* Purchasing options — exactly one per order */}
          {optionsMode && (
            <div id="order-options">
              <p className="text-sm font-semibold mb-2" id="order-options-label">
                {purchaseOptionsHeading || "Choose your option"} <span className="text-red-500">*</span>
              </p>
              <div role="radiogroup" aria-labelledby="order-options-label" className="space-y-3">
                {purchaseOptions!.map((option) => {
                  const selected = option.id === selectedOptionId;
                  const maxQty = maxOrderQuantity(option.price);
                  return (
                    <div
                      key={option.id}
                      className="sp-choice overflow-hidden"
                      data-selected={selected}
                      data-invalid={!!errors.purchaseOption}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => choosePurchaseOption(option)}
                        className="w-full text-left flex gap-3 p-3"
                      >
                        <span
                          className={`mt-1 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            selected ? "border-[var(--product-primary)]" : "sp-border"
                          }`}
                          aria-hidden
                        >
                          {selected && <span className="w-2.5 h-2.5 rounded-full bg-[var(--product-primary)]" />}
                        </span>
                        {option.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={option.imageUrl}
                            alt=""
                            loading="lazy"
                            className="w-16 h-16 sm:w-20 sm:h-20 sp-rounded object-cover shrink-0 sp-surface"
                          />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block font-bold leading-snug">{option.name}</span>
                          {option.description && (
                            <span className="block text-xs sp-muted mt-0.5 leading-relaxed">
                              {option.description}
                            </span>
                          )}
                          {option.includes && option.includes.length > 0 && (
                            <span className="block text-xs sp-muted mt-1.5 space-y-0.5">
                              {option.includes.map((item, i) => (
                                <span key={i} className="flex gap-1.5">
                                  <span className="sp-primary-text" aria-hidden>✓</span>
                                  <span>{item}</span>
                                </span>
                              ))}
                            </span>
                          )}
                          <span className="block text-lg font-extrabold mt-1.5 sp-primary-text">
                            {formatNGN(option.price)}
                          </span>
                        </span>
                      </button>
                      {selected && (
                        <div className="flex items-center justify-between gap-3 border-t sp-border px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Qty</span>
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              disabled={quantity <= MIN_ORDER_QTY}
                              onClick={() => changeOptionQuantity(quantity - 1, maxQty)}
                              className="sp-btn-outline w-9 h-9 text-lg font-bold flex items-center justify-center transition"
                            >−</button>
                            <input
                              type="number"
                              inputMode="numeric"
                              aria-label="Quantity"
                              min={MIN_ORDER_QTY}
                              max={maxQty}
                              value={qtyText}
                              onChange={(e) => {
                                setQtyText(e.target.value);
                                const n = Number(e.target.value);
                                if (Number.isInteger(n) && n >= MIN_ORDER_QTY) changeOptionQuantity(n, maxQty);
                              }}
                              onBlur={() => setQtyText(String(quantity))}
                              className="sp-input w-16 h-9 text-center text-base font-bold"
                            />
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={quantity >= maxQty}
                              onClick={() => changeOptionQuantity(quantity + 1, maxQty)}
                              className="sp-btn-outline w-9 h-9 text-lg font-bold flex items-center justify-center transition"
                            >+</button>
                          </div>
                          <span className="text-sm font-bold" aria-live="polite">
                            {formatNGN(option.price * quantity)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {errors.purchaseOption && <p className="text-xs text-red-500 mt-2">{errors.purchaseOption}</p>}
            </div>
          )}

          {/* Serious Buyers notice */}
          {noticeEnabled && (
            <div
              className={`sp-rounded border px-4 py-4 ${
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
              aria-invalid={!!errors.name}
              className="sp-input w-full px-4 py-3 text-base sm:text-sm"
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
              aria-invalid={!!errors.phone}
              className="sp-input w-full px-4 py-3 text-base sm:text-sm"
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
              aria-invalid={!!errors.state}
              className="sp-input w-full px-4 py-3 text-base sm:text-sm"
            >
              <option value="">— Select State —</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-city">
              City / Town <span className="sp-subtle font-normal">(optional)</span>
            </label>
            <input
              id="of-city" type="text" autoComplete="address-level2"
              autoCorrect="off" autoCapitalize="words" spellCheck={false}
              value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ikeja"
              className="sp-input w-full px-4 py-3 text-base sm:text-sm"
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
              aria-invalid={!!errors.address}
              className="sp-input w-full px-4 py-3 text-base sm:text-sm resize-none"
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          {/* Variant selectors */}
          {!optionsMode && activeOptions.map((option) => {
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
                              selected ? "border-[var(--product-text)] scale-110" : "sp-border"
                            }`}
                            style={{ backgroundColor: val.colour_hex ?? "#ccc" }}
                          />
                          <span className="text-xs sp-muted">{val.value}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : option.display_type === "dropdown" ? (
                  <select
                    value={selectedValues[option.id] ?? ""}
                    onChange={(e) => selectValue(option.id, e.target.value)}
                    aria-invalid={!!err}
                    className="sp-input w-full px-4 py-3 text-base sm:text-sm"
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
                          aria-pressed={selected}
                          className={`px-4 py-2 text-sm font-medium transition ${
                            selected ? "sp-btn" : "sp-btn-outline"
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
            <div className="sp-rounded overflow-hidden border sp-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={matchedVariant.image_url} alt="" className="w-full object-cover max-h-48" />
            </div>
          )}

          {/* Price display (updates with variant) */}
          {!optionsMode && activeOptions.length > 0 && (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{formatNGN(effectivePrice)}</span>
              {effectiveCompareAt && effectiveCompareAt > effectivePrice && (
                <span className="text-base sp-subtle line-through">{formatNGN(effectiveCompareAt)}</span>
              )}
              {outOfStock && (
                <span className="text-sm text-red-500 font-medium">Out of stock</span>
              )}
            </div>
          )}

          {/* Delivery preference */}
          {deliveryEnabled && (
            <fieldset>
              <legend className="block text-sm font-semibold mb-2">
                {delivery!.label} <span className="text-red-500">*</span>
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  ["asap", delivery!.asapLabel],
                  ["date", delivery!.dateLabel],
                ] as const).map(([value, label]) => (
                  <label
                    key={value}
                    className="sp-choice flex items-center gap-2.5 px-4 py-3 text-sm font-medium cursor-pointer"
                    data-selected={deliveryPref === value}
                  >
                    <input
                      type="radio"
                      name="delivery_preference"
                      value={value}
                      checked={deliveryPref === value}
                      onChange={() => {
                        setDeliveryPref(value);
                        setErrors((e) => ({ ...e, deliveryDate: "" }));
                      }}
                      className="w-4 h-4 shrink-0 accent-[var(--product-primary)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {deliveryPref === "date" && (
                <div className="mt-3">
                  <label className="block text-xs font-medium sp-muted mb-1" htmlFor="of-delivery-date">
                    Preferred delivery date
                  </label>
                  <input
                    id="of-delivery-date"
                    type="date"
                    required
                    min={today}
                    max={latestDeliveryDate(today!)}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    aria-invalid={!!errors.deliveryDate}
                    className="sp-input w-full px-4 py-3 text-base sm:text-sm"
                  />
                  <p className="text-xs sp-subtle mt-1">
                    This is your preferred date — we will confirm the delivery date when we call you.
                  </p>
                  {errors.deliveryDate && <p className="text-xs text-red-500 mt-1">{errors.deliveryDate}</p>}
                </div>
              )}
            </fieldset>
          )}

          {optionsMode ? (
            <div className="sp-surface sp-rounded px-4 py-4 text-sm" aria-live="polite">
              <p className="font-semibold mb-2">Order summary</p>
              {selectedOption ? (
                <dl className="space-y-1.5">
                  {([
                    ["Product", productName],
                    ["Option", selectedOption.name],
                    ["Unit price", formatNGN(selectedOption.price)],
                    ["Quantity", String(quantity)],
                    ...(deliveryEnabled
                      ? [[
                          "Delivery",
                          deliveryPref === "date"
                            ? deliveryDate && !validateDeliveryDate(deliveryDate, today)
                              ? `Preferred date: ${formatDeliveryDate(deliveryDate)}`
                              : "Preferred date: not chosen yet"
                            : delivery!.asapLabel,
                        ] as [string, string]]
                      : []),
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="sp-muted shrink-0">{k}</dt>
                      <dd className="font-medium text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="sp-muted">Choose an option above to see your total.</p>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t sp-border mt-3">
                <span>Total (Pay on delivery)</span>
                <span className="sp-primary-text">{selectedOption ? formatNGN(total) : "—"}</span>
              </div>
            </div>
          ) : (
          <>
          <div>
            <label className="block text-sm font-semibold mb-1">Quantity</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="sp-btn-outline w-10 h-10 text-xl font-bold flex items-center justify-center transition">−</button>
              <span className="text-xl font-bold w-6 text-center">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="sp-btn-outline w-10 h-10 text-xl font-bold flex items-center justify-center transition">+</button>
            </div>
          </div>

          <div className="sp-surface sp-rounded px-4 py-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="sp-muted">{productName} × {quantity}</span>
              <span className="font-semibold">{formatNGN(total)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t sp-border mt-2">
              <span>Total (Pay on delivery)</span>
              <span className="sp-primary-text">{formatNGN(total)}</span>
            </div>
          </div>
          </>
          )}

          {apiError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 sp-rounded px-4 py-3" role="alert">
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!optionsMode && (outOfStock || (activeOptions.length > 0 && !hasAllRequired)))}
            className="sp-btn w-full font-extrabold text-lg py-4 shadow-md"
          >
            {loading ? "Placing order…"
              : !optionsMode && outOfStock ? "Out of Stock"
              : (ctaText ?? "Order Now — Pay on Delivery")}
          </button>

          <p className="text-center text-xs sp-subtle">
            No payment before delivery. Pay in full when your order is delivered.
          </p>
        </form>
      </div>
    </section>
  );
}
