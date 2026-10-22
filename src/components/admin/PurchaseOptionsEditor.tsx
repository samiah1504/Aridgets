"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNGN } from "@/lib/utils/currency";
import { formatStringList, parseStringList } from "@/lib/utils/bulkContent";
import type { PurchaseOption } from "@/types";

// Admin editor for the purchasing options of a Product Options & Bundles page.
// Fully controlled: changes go to the parent form and are saved with its Save
// button (validated there before saving/publishing).

interface Props {
  productId: string;
  value: PurchaseOption[];
  onChange: (options: PurchaseOption[]) => void;
  /** Draws attention to unavailable options (a live page needs at least one) */
  highlightUnavailable?: boolean;
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition";

function newOption(): PurchaseOption {
  return { id: crypto.randomUUID(), name: "", price: 0, active: true };
}

export default function PurchaseOptionsEditor({ productId, value, onChange, highlightUnavailable }: Props) {
  // Raw "included items" text per option, so typing newlines isn't swallowed
  const [includesText, setIncludesText] = useState<Record<string, string>>(() =>
    Object.fromEntries(value.map((o) => [o.id, formatStringList(o.includes)]))
  );
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    createClient()
      .from("product_media")
      .select("url, kind, sort_order")
      .eq("product_id", productId)
      .eq("kind", "image")
      .order("sort_order")
      .then(({ data }) => setImages((data ?? []).map((m) => m.url)));
  }, [productId]);

  function update(index: number, patch: Partial<PurchaseOption>) {
    onChange(value.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    const o = value[index];
    if (o.name.trim() && !window.confirm(`Remove “${o.name.trim()}”?`)) return;
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
          No options yet. Add the first purchasing option your customers can choose.
        </p>
      )}

      {value.map((o, i) => (
        <div
          key={o.id}
          className={`rounded-xl border p-4 space-y-3 ${o.active ? "border-gray-200" : "border-dashed border-gray-200 bg-gray-50"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">
              Option {i + 1}
              {o.price > 0 && <span className="ml-2 font-normal text-gray-400">{formatNGN(o.price)}</span>}
              {!o.active && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                  Not available
                </span>
              )}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move option ${i + 1} up`}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition"
              >↑</button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                aria-label={`Move option ${i + 1} down`}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition"
              >↓</button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-medium text-red-500 hover:bg-red-50 transition"
              >Remove</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`po-name-${o.id}`}>
                Option name *
              </label>
              <input
                id={`po-name-${o.id}`}
                value={o.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="e.g. Complete set with accessories"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`po-price-${o.id}`}>
                Unit price (₦) *
              </label>
              <input
                id={`po-price-${o.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={o.price || ""}
                onChange={(e) => update(i, { price: e.target.value === "" ? 0 : Number(e.target.value) })}
                placeholder="e.g. 150000"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`po-desc-${o.id}`}>
              Short description
            </label>
            <textarea
              id={`po-desc-${o.id}`}
              rows={2}
              value={o.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value })}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`po-inc-${o.id}`}>
              Included items <span className="font-normal text-gray-400">— optional, one per line</span>
            </label>
            <textarea
              id={`po-inc-${o.id}`}
              rows={3}
              value={includesText[o.id] ?? ""}
              onChange={(e) => {
                const text = e.target.value;
                setIncludesText((t) => ({ ...t, [o.id]: text }));
                const items = parseStringList(text).items;
                update(i, { includes: items.length ? items : undefined });
              }}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`po-img-${o.id}`}>
              Image <span className="font-normal text-gray-400">— optional</span>
            </label>
            <div className="flex gap-2 items-start">
              {o.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0" />
              )}
              <input
                id={`po-img-${o.id}`}
                value={o.imageUrl ?? ""}
                onChange={(e) => update(i, { imageUrl: e.target.value.trim() || undefined })}
                placeholder="Paste an image URL or pick a product image below"
                className={inputClass}
              />
            </div>
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pt-2">
                {images.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => update(i, { imageUrl: o.imageUrl === url ? undefined : url })}
                    aria-label="Use this product image"
                    className={`w-12 h-12 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      o.imageUrl === url ? "border-indigo-600" : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <label
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer select-none transition ${
              o.active
                ? "border-green-200 bg-green-50"
                : highlightUnavailable
                  ? "border-amber-300 bg-amber-50 ring-2 ring-amber-200"
                  : "border-gray-200 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={o.active}
              onChange={(e) => update(i, { active: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-indigo-600 shrink-0"
            />
            <span>
              <span className="block text-sm text-gray-800 font-medium">Available to customers</span>
              <span className="block text-xs text-gray-500">
                {o.active
                  ? "Shown on the sales page and can be ordered."
                  : "Hidden from the sales page. Tick to let customers order it."}
              </span>
            </span>
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          const o = newOption();
          setIncludesText((t) => ({ ...t, [o.id]: "" }));
          onChange([...value, o]);
        }}
        className="w-full rounded-xl border-2 border-dashed border-indigo-200 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition"
      >
        + Add option
      </button>
    </div>
  );
}
