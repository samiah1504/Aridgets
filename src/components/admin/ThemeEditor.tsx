"use client";

import { useState } from "react";
import ThemePreview from "./ThemePreview";
import { SALES_FONTS, fontVariablesClass } from "@/lib/fonts";
import {
  BUTTON_SHAPES,
  CARD_STYLES,
  SECTION_SPACINGS,
  THEME_PRESETS,
  contrastWarnings,
  matchingPreset,
  resolveTheme,
  themeCssVars,
  type ThemeColourField,
} from "@/lib/theme";
import type { ProductContent, ProductTheme, SectionConfig } from "@/types";

// Theme tab: presets are shortcuts that fill the four colour fields; every
// value stays editable and the preview updates before anything is saved.

interface Props {
  theme: ProductTheme;
  onChange: (updates: Partial<ProductTheme>) => void;
  productName: string;
  price: number;
  content: ProductContent;
  sections: SectionConfig[];
  templateType: string | null;
}

const COLOUR_FIELDS: { key: ThemeColourField; label: string; hint: string }[] = [
  { key: "primary", label: "Primary colour", hint: "Buttons, prices, highlights" },
  { key: "accent", label: "Accent colour", hint: "Badges and decorative details" },
  { key: "background", label: "Background", hint: "Page background" },
  { key: "text", label: "Text colour", hint: "Headings and body text" },
];

const HEX = /^#[0-9a-f]{6}$/i;

function ColourInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Typed text is kept locally; only valid #rrggbb values reach the theme
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = focused ? draft : value;
  const invalid = focused && !HEX.test(draft);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <p className="text-xs text-gray-400 mb-1.5">{hint}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} picker`}
          className="w-12 h-12 shrink-0 rounded-lg border border-gray-200 cursor-pointer p-1 bg-white"
        />
        <input
          type="text"
          value={shown}
          aria-label={`${label} hex value`}
          aria-invalid={invalid}
          onFocus={() => { setDraft(value); setFocused(true); }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const v = e.target.value.trim();
            setDraft(v);
            if (HEX.test(v)) onChange(v.toLowerCase());
          }}
          maxLength={7}
          className={`min-w-0 flex-1 h-12 border rounded-lg px-3 text-base sm:text-sm font-mono outline-none focus:ring-2 transition ${
            invalid ? "border-red-300 focus:ring-red-500/20" : "border-gray-200 focus:ring-indigo-500/30 focus:border-indigo-500"
          }`}
        />
      </div>
      {invalid && <p className="text-xs text-red-500 mt-1">Use a 6-digit hex colour, e.g. #1b2a4a</p>}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg bg-gray-100 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-10 px-2 py-2 text-xs sm:text-sm font-medium rounded-md transition ${
              value === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ThemeEditor({ theme: raw, onChange, productName, price, content, sections, templateType }: Props) {
  const theme = resolveTheme(raw);
  const exact = matchingPreset(theme);
  const basedOn = THEME_PRESETS.find((p) => p.id === theme.preset);
  const customised = !!basedOn && exact?.id !== basedOn.id;
  const warnings = contrastWarnings(theme);

  return (
    <div className={`space-y-6 ${fontVariablesClass}`}>
      {/* Presets */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Theme Presets</h3>
          <p className="text-xs text-gray-500" aria-live="polite">
            {exact
              ? <>Using <span className="font-semibold text-gray-700">{exact.name}</span></>
              : customised
                ? <>Customised · based on <span className="font-semibold text-gray-700">{basedOn.name}</span></>
                : "Custom colours"}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {THEME_PRESETS.map((p) => {
            const active = exact?.id === p.id;
            const base = !active && customised && basedOn?.id === p.id;
            const vars = themeCssVars(resolveTheme({ ...theme, ...p }), "inherit");
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange({ primary: p.primary, accent: p.accent, background: p.background, text: p.text, preset: p.id })
                }
                className={`text-left rounded-xl border-2 p-3 transition ${
                  active ? "border-indigo-600 bg-indigo-50" : base ? "border-indigo-300 border-dashed" : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <span className="flex gap-1.5 mb-2" aria-hidden>
                  {[p.primary, p.accent, p.background, p.text].map((c, i) => (
                    <span
                      key={i}
                      className="w-6 h-6 rounded-full border border-black/10 bg-[var(--swatch)]"
                      style={{ "--swatch": c } as React.CSSProperties}
                    />
                  ))}
                </span>
                <span className="block text-sm font-semibold text-gray-900 leading-tight">{p.name}</span>
                <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{p.description}</span>
                {/* Mini preview in the preset's own colours */}
                <span
                  className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-black/5 px-2 py-1.5 bg-[var(--product-bg)] text-[var(--product-text)]"
                  style={vars as React.CSSProperties}
                  aria-hidden
                >
                  <span className="text-[11px] font-semibold truncate">Aa Headline</span>
                  <span className="sp-btn px-2 py-0.5 text-[10px] font-bold shrink-0">Order</span>
                </span>
                {base && <span className="block text-[11px] font-medium text-indigo-600 mt-1.5">Customised</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Colours */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Colours</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLOUR_FIELDS.map((f) => (
            <ColourInput
              key={f.key}
              label={f.label}
              hint={f.hint}
              value={theme[f.key]}
              onChange={(v) => onChange({ [f.key]: v })}
            />
          ))}
        </div>
        <div className="mt-4" aria-live="polite">
          {warnings.length === 0 ? (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              ✓ Text and buttons meet WCAG AA contrast with these colours.
            </p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((w) => (
                <li key={w.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                  <p>⚠️ {w.message}</p>
                  {w.suggestion && (
                    <button
                      type="button"
                      onClick={() => onChange({ [w.field]: w.suggestion! })}
                      className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 font-semibold text-amber-900 hover:bg-amber-100 transition"
                    >
                      <span
                        className="w-4 h-4 rounded border border-black/10 bg-[var(--swatch)]"
                        style={{ "--swatch": w.suggestion } as React.CSSProperties}
                        aria-hidden
                      />
                      Use {w.suggestion} for the {COLOUR_FIELDS.find((f) => f.key === w.field)!.label.toLowerCase()}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Font */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Font</h3>
        <div role="radiogroup" aria-label="Font" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SALES_FONTS.map((f) => {
            const active = theme.font === f.name;
            return (
              <button
                key={f.name}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ font: f.name })}
                className={`text-left rounded-xl border-2 px-3 py-2.5 transition [font-family:var(--font-sample)] ${
                  active ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:border-gray-300"
                }`}
                style={{ "--font-sample": `var(${f.variable}), system-ui, sans-serif` } as React.CSSProperties}
              >
                <span className="block text-xl font-bold text-gray-900 leading-none">Aa</span>
                <span className="block text-sm font-semibold text-gray-900 mt-1">{f.name}</span>
                <span className="block text-[11px] text-gray-500">{f.note}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Additional design settings */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900">Additional Design Settings</h3>
        <p className="text-xs text-gray-400 mb-3">Optional. Applied across the whole sales page.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Segmented label="Button shape" value={theme.buttonShape} options={BUTTON_SHAPES} onChange={(v) => onChange({ buttonShape: v })} />
          <Segmented label="Card style" value={theme.cardStyle} options={CARD_STYLES} onChange={(v) => onChange({ cardStyle: v })} />
          <Segmented label="Section spacing" value={theme.spacing} options={SECTION_SPACINGS} onChange={(v) => onChange({ spacing: v })} />
        </div>
      </section>

      <ThemePreview
        theme={theme}
        productName={productName}
        price={price}
        content={content}
        sections={sections}
        templateType={templateType}
      />
    </div>
  );
}
