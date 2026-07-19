"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProductOption, ProductOptionValue, ProductVariant, OptionDisplayType } from "@/types";

interface Props {
  productId: string;
}

function cartesian(arrays: ProductOptionValue[][]): ProductOptionValue[][] {
  return arrays.reduce<ProductOptionValue[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]]
  );
}

export default function VariationsEditor({ productId }: Props) {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { load(); }, [productId]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [optRes, varRes] = await Promise.all([
      supabase
        .from("product_options")
        .select("id, product_id, name, display_type, required, sort_order, product_option_values(id, product_option_id, value, colour_hex, image_url, sort_order, active)")
        .eq("product_id", productId)
        .order("sort_order"),
      supabase
        .from("product_variants")
        .select("id, product_id, sku, price_override, compare_at_price_override, stock_quantity, active, image_url, sort_order, product_variant_options(option_value_id)")
        .eq("product_id", productId)
        .order("sort_order"),
    ]);

    const opts: ProductOption[] = (optRes.data ?? []).map((o) => ({
      id: o.id,
      product_id: o.product_id,
      name: o.name,
      display_type: o.display_type as OptionDisplayType,
      required: o.required,
      sort_order: o.sort_order,
      values: ((o.product_option_values ?? []) as ProductOptionValue[]).sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    }));

    const vars: ProductVariant[] = (varRes.data ?? []).map((v) => ({
      id: v.id,
      product_id: v.product_id,
      sku: v.sku,
      price_override: v.price_override,
      compare_at_price_override: v.compare_at_price_override,
      stock_quantity: v.stock_quantity,
      active: v.active,
      image_url: v.image_url,
      sort_order: v.sort_order,
      option_value_ids: ((v.product_variant_options ?? []) as Array<{ option_value_id: string }>).map(
        (pvo) => pvo.option_value_id
      ),
    }));

    setOptions(opts);
    setVariants(vars);
    setLoading(false);
  }

  // ── Option CRUD ──────────────────────────────────────────────────────────

  async function addOption() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_options")
      .insert({ product_id: productId, name: "New Option", display_type: "buttons", required: true, sort_order: options.length })
      .select("id, product_id, name, display_type, required, sort_order")
      .single();
    if (!error && data) {
      setOptions((prev) => [...prev, { ...(data as unknown as Omit<ProductOption, "values">), values: [] }]);
    }
  }

  async function deleteOption(optionId: string) {
    if (!confirm("Delete this option and all its values? Variants using it will also be removed.")) return;
    const supabase = createClient();
    await supabase.from("product_options").delete().eq("id", optionId);
    await load();
  }

  async function persistOption(optionId: string, updates: Partial<Pick<ProductOption, "name" | "display_type" | "required">>) {
    const supabase = createClient();
    await supabase.from("product_options").update(updates).eq("id", optionId);
    setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, ...updates } : o)));
  }

  // ── Value CRUD ───────────────────────────────────────────────────────────

  async function addValue(optionId: string) {
    const supabase = createClient();
    const option = options.find((o) => o.id === optionId);
    const { data, error } = await supabase
      .from("product_option_values")
      .insert({ product_option_id: optionId, value: "New Value", sort_order: option?.values.length ?? 0, active: true })
      .select("id, product_option_id, value, colour_hex, image_url, sort_order, active")
      .single();
    if (!error && data) {
      setOptions((prev) =>
        prev.map((o) => (o.id === optionId ? { ...o, values: [...o.values, data as unknown as ProductOptionValue] } : o))
      );
    }
  }

  async function deleteValue(optionId: string, valueId: string) {
    const supabase = createClient();
    await supabase.from("product_option_values").delete().eq("id", valueId);
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, values: o.values.filter((v) => v.id !== valueId) } : o))
    );
    await load();
  }

  async function persistValue(
    optionId: string,
    valueId: string,
    updates: Partial<Pick<ProductOptionValue, "value" | "colour_hex" | "image_url" | "active">>
  ) {
    const supabase = createClient();
    await supabase.from("product_option_values").update(updates).eq("id", valueId);
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? { ...o, values: o.values.map((v) => (v.id === valueId ? { ...v, ...updates } : v)) }
          : o
      )
    );
  }

  // ── Variant generation ───────────────────────────────────────────────────

  async function generateVariants() {
    setNotice("");
    const activeByOption = options.map((o) => o.values.filter((v) => v.active));
    if (activeByOption.some((vals) => vals.length === 0)) {
      setNotice("Each option needs at least one active value before generating combinations.");
      return;
    }
    if (options.length === 0) {
      setNotice("Add at least one option first.");
      return;
    }

    const combos = cartesian(activeByOption);
    const newCombos = combos.filter((combo) => {
      const ids = new Set(combo.map((v) => v.id));
      return !variants.some(
        (vr) => vr.option_value_ids.length === ids.size && vr.option_value_ids.every((id) => ids.has(id))
      );
    });

    if (!newCombos.length) {
      setNotice("All combinations already exist.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    for (const combo of newCombos) {
      const { data: newVar, error } = await supabase
        .from("product_variants")
        .insert({ product_id: productId, active: true, sort_order: variants.length })
        .select("id")
        .single();
      if (error || !newVar) continue;
      await supabase.from("product_variant_options").insert(
        combo.map((v) => ({ variant_id: (newVar as { id: string }).id, option_value_id: v.id }))
      );
    }

    await load();
    setNotice(`Created ${newCombos.length} variant(s).`);
    setBusy(false);
  }

  // ── Variant CRUD ─────────────────────────────────────────────────────────

  async function persistVariant(
    variantId: string,
    updates: Partial<Pick<ProductVariant, "price_override" | "compare_at_price_override" | "stock_quantity" | "image_url" | "active">>
  ) {
    const supabase = createClient();
    await supabase.from("product_variants").update(updates).eq("id", variantId);
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, ...updates } : v)));
  }

  async function deleteVariant(variantId: string) {
    if (!confirm("Delete this variant?")) return;
    const supabase = createClient();
    await supabase.from("product_variants").delete().eq("id", variantId);
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  }

  function variantLabel(variant: ProductVariant): string {
    const vals = options.flatMap((o) => o.values.filter((v) => variant.option_value_ids.includes(v.id)));
    return vals.map((v) => v.value).join(" / ") || "Default";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading…</p>;

  return (
    <div className="space-y-10">
      {notice && (
        <div className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
          {notice}
        </div>
      )}

      {/* ── Options ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Options</h3>
          <button
            onClick={addOption}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            + Add option
          </button>
        </div>

        {options.length === 0 && (
          <p className="text-sm text-gray-400">
            No options yet. Add one to define variants (e.g. Colour, Size, Age Range).
          </p>
        )}

        <div className="space-y-4">
          {options.map((option) => (
            <div key={option.id} className="border border-gray-200 rounded-xl p-4">
              {/* Option header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    defaultValue={option.name}
                    onBlur={(e) => persistOption(option.id, { name: e.target.value.trim() || option.name })}
                    placeholder="Option name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                  <div className="flex flex-wrap gap-3 items-center">
                    <select
                      value={option.display_type}
                      onChange={(e) => persistOption(option.id, { display_type: e.target.value as OptionDisplayType })}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                    >
                      <option value="buttons">Buttons</option>
                      <option value="colour_swatch">Colour Swatch</option>
                      <option value="dropdown">Dropdown</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={option.required}
                        onChange={(e) => persistOption(option.id, { required: e.target.checked })}
                        className="w-3.5 h-3.5 accent-indigo-600"
                      />
                      Required
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => deleteOption(option.id)}
                  className="text-gray-300 hover:text-red-400 transition text-xl leading-none mt-1 shrink-0"
                >
                  ×
                </button>
              </div>

              {/* Values */}
              <div className="space-y-2">
                {option.values.map((val) => (
                  <div key={val.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    {option.display_type === "colour_swatch" && (
                      <input
                        type="color"
                        value={val.colour_hex ?? "#cccccc"}
                        onChange={(e) => persistValue(option.id, val.id, { colour_hex: e.target.value })}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"
                      />
                    )}
                    <input
                      type="text"
                      defaultValue={val.value}
                      onBlur={(e) => persistValue(option.id, val.id, { value: e.target.value.trim() || val.value })}
                      placeholder="Value (e.g. Red)"
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val.active}
                        onChange={(e) => persistValue(option.id, val.id, { active: e.target.checked })}
                        className="w-3.5 h-3.5 accent-indigo-600"
                      />
                      Active
                    </label>
                    <button
                      onClick={() => deleteValue(option.id, val.id)}
                      className="text-gray-300 hover:text-red-400 transition text-lg leading-none shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addValue(option.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                >
                  + Add value
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Variants ── */}
      {options.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Variants
              {variants.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">({variants.length})</span>
              )}
            </h3>
            <button
              onClick={generateVariants}
              disabled={busy}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium transition disabled:opacity-60"
            >
              {busy ? "Generating…" : "Generate combinations"}
            </button>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-gray-400">
              No variants yet. Click "Generate combinations" to create all option combinations.
            </p>
          ) : (
            <div className="space-y-3">
              {variants.map((variant) => (
                <div key={variant.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800 mb-3">{variantLabel(variant)}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Price override (₦)</label>
                          <input
                            type="number"
                            defaultValue={variant.price_override ?? ""}
                            onBlur={(e) =>
                              persistVariant(variant.id, {
                                price_override: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="Base price"
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Stock qty</label>
                          <input
                            type="number"
                            defaultValue={variant.stock_quantity ?? ""}
                            onBlur={(e) =>
                              persistVariant(variant.id, {
                                stock_quantity: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="Unlimited"
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 block mb-1">Variant image URL</label>
                          <input
                            type="url"
                            defaultValue={variant.image_url ?? ""}
                            onBlur={(e) =>
                              persistVariant(variant.id, { image_url: e.target.value || null })
                            }
                            placeholder="https://…"
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={variant.active}
                          onChange={(e) => persistVariant(variant.id, { active: e.target.checked })}
                          className="w-3.5 h-3.5 accent-indigo-600"
                        />
                        Active (visible to customers)
                      </label>
                    </div>
                    <button
                      onClick={() => deleteVariant(variant.id)}
                      className="text-gray-300 hover:text-red-400 transition text-xl leading-none shrink-0"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
