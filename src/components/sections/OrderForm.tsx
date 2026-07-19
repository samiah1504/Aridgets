"use client";

import { useState, useEffect, useCallback } from "react";
import { NIGERIAN_STATES } from "@/lib/constants/states";
import { formatNGN } from "@/lib/utils/currency";
import { isValidNGPhone } from "@/lib/utils/phone";

interface OrderFormProps {
  productId: string;
  productName: string;
  price: number;
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
}

interface SuccessData {
  order_number: string;
  total: number;
  name: string;
  event_id_lead: string;
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  return match ? match.split("=")[1] : undefined;
}

export default function OrderForm({
  productId,
  productName,
  price,
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
}: OrderFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [apiError, setApiError] = useState("");
  const [fbp, setFbp] = useState<string | undefined>();
  const [fbc, setFbc] = useState<string | undefined>();

  useEffect(() => {
    setFbp(getCookie("_fbp"));
    setFbc(getCookie("_fbc"));
  }, []);

  const total = price * quantity;

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    else if (!isValidNGPhone(phone)) e.phone = "Enter a valid Nigerian phone number";
    if (!state) e.state = "Please select your state";
    if (!address.trim()) e.address = "Delivery address is required";
    return e;
  }, [name, phone, state, address]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");

    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          name: name.trim(),
          phone: phone.trim(),
          state,
          city: city.trim() || undefined,
          address: address.trim(),
          quantity,
          fbp,
          fbc,
          fbclid,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_content: utmContent,
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Something went wrong. Please try again.";
        setApiError(msg);
        return;
      }

      const result = data as SuccessData;
      setSuccess(result);

      // Fire pixel Lead event (deduplication via eventID matches CAPI)
      if (pixelId && typeof window !== "undefined" && "fbq" in window) {
        (window as Window & { fbq: Function }).fbq(
          "track",
          "Lead",
          { value: result.total, currency: "NGN" },
          { eventID: result.event_id_lead }
        );
      }

      // Scroll success message into view (the success card renders inside #order)
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
        <div
          className="rounded-2xl p-8 text-center text-white"
          style={{ backgroundColor: "var(--product-primary)" }}
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-extrabold mb-3">
            {successHeadline ?? "Order Received!"}
          </h2>
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
        {/* Header */}
        <div
          className="px-6 py-5 text-white"
          style={{ backgroundColor: "var(--product-primary)" }}
        >
          <h2 className="text-xl font-extrabold">
            {title ?? `Order ${productName} — Pay on Delivery`}
          </h2>
          <p className="text-sm opacity-80 mt-1">
            Fill the form below. We call to confirm before delivery.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-name">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="of-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amaka Johnson"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition ${
                errors.name
                  ? "border-red-400 focus:ring-red-200"
                  : "border-gray-200 focus:ring-[var(--product-primary)]/30 focus:border-[var(--product-primary)]"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-phone">
              WhatsApp / Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="of-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition ${
                errors.phone
                  ? "border-red-400 focus:ring-red-200"
                  : "border-gray-200 focus:ring-[var(--product-primary)]/30 focus:border-[var(--product-primary)]"
              }`}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-state">
              State <span className="text-red-500">*</span>
            </label>
            <select
              id="of-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition bg-white ${
                errors.state
                  ? "border-red-400 focus:ring-red-200"
                  : "border-gray-200 focus:ring-[var(--product-primary)]/30 focus:border-[var(--product-primary)]"
              }`}
            >
              <option value="">— Select State —</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="text-xs text-red-500 mt-1">{errors.state}</p>
            )}
          </div>

          {/* City / Town */}
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-city">
              City / Town <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="of-city"
              type="text"
              autoComplete="address-level2"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ikeja"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--product-primary)]/30 focus:border-[var(--product-primary)] transition"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="of-address">
              Delivery Address <span className="text-red-500">*</span>
            </label>
            <textarea
              id="of-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House number, street, nearest landmark"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition resize-none ${
                errors.address
                  ? "border-red-400 focus:ring-red-200"
                  : "border-gray-200 focus:ring-[var(--product-primary)]/30 focus:border-[var(--product-primary)]"
              }`}
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1">{errors.address}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold mb-1">Quantity</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border border-gray-200 text-xl font-bold flex items-center justify-center active:bg-gray-100 transition"
              >
                −
              </button>
              <span className="text-xl font-bold w-6 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-full border border-gray-200 text-xl font-bold flex items-center justify-center active:bg-gray-100 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl px-4 py-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">{productName} × {quantity}</span>
              <span className="font-semibold">{formatNGN(total)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 mt-2">
              <span>Total (Pay on delivery)</span>
              <span style={{ color: "var(--product-primary)" }}>{formatNGN(total)}</span>
            </div>
          </div>

          {apiError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-extrabold text-lg py-4 rounded-2xl shadow-md active:scale-95 transition-all disabled:opacity-60"
            style={{ backgroundColor: "var(--product-primary)" }}
          >
            {loading ? "Placing order…" : (ctaText ?? "Order Now — Pay on Delivery")}
          </button>

          <p className="text-center text-xs text-gray-400">
            No online payment. You pay cash only when the rider delivers.
          </p>
        </form>
      </div>
    </section>
  );
}
