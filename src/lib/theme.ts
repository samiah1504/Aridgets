// Sales page theme: presets, defaults, design tokens and contrast checks.
// A product's theme (products.theme) holds the four colours and font, plus
// optional preset/design settings. Older pages store only colours + font;
// resolveTheme() fills in defaults that match the original look.

import type { ButtonShape, CardStyle, ProductTheme, SectionSpacing } from "@/types";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "navy_gold", name: "Navy & Gold", description: "Premium furniture and executive products", primary: "#1b2a4a", accent: "#c9a227", background: "#fffdf8", text: "#1a1a1a" },
  { id: "black_white", name: "Black & White", description: "Minimalist and modern products", primary: "#111111", accent: "#525252", background: "#ffffff", text: "#111111" },
  { id: "green_cream", name: "Green & Cream", description: "Natural and elegant products", primary: "#2f5d3a", accent: "#c8a96a", background: "#fbf7ee", text: "#1f2a1f" },
  { id: "purple_white", name: "Purple & White", description: "Modern and distinctive products", primary: "#5b2a86", accent: "#a78bfa", background: "#ffffff", text: "#1e1530" },
  { id: "red_white", name: "Red & White", description: "Promotional sales pages", primary: "#c1121f", accent: "#ffb703", background: "#ffffff", text: "#1a1a1a" },
  { id: "earth", name: "Neutral & Earth Tones", description: "Home and lifestyle products", primary: "#7a5230", accent: "#a3b18a", background: "#f6f1ea", text: "#2b2420" },
];

export const THEME_DEFAULTS = {
  primary: "#e63946",
  accent: "#f1a208",
  background: "#ffffff",
  text: "#1a1a1a",
  font: "Inter",
  buttonShape: "rounded" as ButtonShape,
  cardStyle: "border" as CardStyle,
  spacing: "comfortable" as SectionSpacing,
};

export const BUTTON_SHAPES: { value: ButtonShape; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Slightly Rounded" },
  { value: "pill", label: "Pill" },
];
export const CARD_STYLES: { value: CardStyle; label: string }[] = [
  { value: "border", label: "Simple Border" },
  { value: "shadow", label: "Subtle Shadow" },
];
export const SECTION_SPACINGS: { value: SectionSpacing; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

export type ResolvedTheme = Required<Omit<ProductTheme, "preset">> & { preset?: string };

const HEX_RE = /^#[0-9a-f]{6}$/i;

function hexOr(value: string | undefined, fallback: string): string {
  if (value && /^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value.slice(1).split("").map((c) => c + c).join("")}`.toLowerCase();
  }
  return value && HEX_RE.test(value) ? value.toLowerCase() : fallback;
}

export function resolveTheme(theme: Partial<ProductTheme> | null | undefined): ResolvedTheme {
  const t = theme ?? {};
  return {
    primary: hexOr(t.primary, THEME_DEFAULTS.primary),
    accent: hexOr(t.accent, THEME_DEFAULTS.accent),
    background: hexOr(t.background, THEME_DEFAULTS.background),
    text: hexOr(t.text, THEME_DEFAULTS.text),
    font: t.font || THEME_DEFAULTS.font,
    buttonShape: t.buttonShape ?? THEME_DEFAULTS.buttonShape,
    cardStyle: t.cardStyle ?? THEME_DEFAULTS.cardStyle,
    spacing: t.spacing ?? THEME_DEFAULTS.spacing,
    preset: t.preset,
  };
}

/** The preset whose four colours exactly match, if any. */
export function matchingPreset(theme: ResolvedTheme): ThemePreset | undefined {
  return THEME_PRESETS.find(
    (p) =>
      p.primary === theme.primary &&
      p.accent === theme.accent &&
      p.background === theme.background &&
      p.text === theme.text
  );
}

// ── Colour maths ────────────────────────────────────────────────────────────

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** Blend `a` into `b`: amount 1 = all `a`. */
export function mix(a: string, b: string, amount: number): string {
  const ca = rgb(a), cb = rgb(b);
  return toHex([0, 1, 2].map((i) => ca[i] * amount + cb[i] * (1 - amount)) as [number, number, number]);
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const DARK_ON = "#111111";
const LIGHT_ON = "#ffffff";

/** The more readable of white or near-black text on a colour. */
export function readableOn(hex: string): string {
  return contrastRatio(LIGHT_ON, hex) >= contrastRatio(DARK_ON, hex) ? LIGHT_ON : DARK_ON;
}

/**
 * Nearest colour to `fg` (same hue, moved darker or lighter) that reaches
 * `target` contrast against `bg`; null if `fg` already passes.
 */
export function suggestReadable(fg: string, bg: string, target: number): string | null {
  if (contrastRatio(fg, bg) >= target) return null;
  for (let step = 1; step <= 20; step++) {
    const amount = step / 20;
    for (const toward of ["#000000", "#ffffff"]) {
      const candidate = mix(toward, fg, amount);
      if (contrastRatio(candidate, bg) >= target) return candidate;
    }
  }
  return null;
}

// ── Contrast checks (WCAG AA: 4.5 normal text, 3 large/bold text) ───────────

export type ThemeColourField = "primary" | "accent" | "background" | "text";

export interface ContrastWarning {
  id: string;
  message: string;
  ratio: number;
  required: number;
  field: ThemeColourField;
  suggestion: string | null;
}

export function contrastWarnings(theme: ResolvedTheme): ContrastWarning[] {
  const out: ContrastWarning[] = [];
  const fmt = (r: number) => r.toFixed(1);

  const bodyRatio = contrastRatio(theme.text, theme.background);
  if (bodyRatio < 4.5) {
    out.push({
      id: "text",
      field: "text",
      ratio: bodyRatio,
      required: 4.5,
      message: `Body text is hard to read on this background (${fmt(bodyRatio)}:1, needs 4.5:1).`,
      suggestion: suggestReadable(theme.text, theme.background, 4.5),
    });
  }

  const buttonRatio = contrastRatio(readableOn(theme.primary), theme.primary);
  if (buttonRatio < 4.5) {
    out.push({
      id: "button",
      field: "primary",
      ratio: buttonRatio,
      required: 4.5,
      message: `Button and announcement text may be hard to read on the primary colour (${fmt(buttonRatio)}:1, needs 4.5:1).`,
      suggestion: suggestReadable(theme.primary, readableOn(theme.primary), 4.5),
    });
  }

  const primaryRatio = contrastRatio(theme.primary, theme.background);
  if (primaryRatio < 3) {
    out.push({
      id: "primary",
      field: "primary",
      ratio: primaryRatio,
      required: 3,
      message: `Prices, links and selected options use the primary colour, which is faint on this background (${fmt(primaryRatio)}:1, needs 3:1 for large text).`,
      suggestion: suggestReadable(theme.primary, theme.background, 3),
    });
  }

  const accentRatio = contrastRatio(readableOn(theme.accent), theme.accent);
  if (accentRatio < 4.5) {
    out.push({
      id: "accent",
      field: "accent",
      ratio: accentRatio,
      required: 4.5,
      message: `Text on accent badges may be hard to read (${fmt(accentRatio)}:1, needs 4.5:1).`,
      suggestion: suggestReadable(theme.accent, readableOn(theme.accent), 4.5),
    });
  }
  return out;
}

// ── CSS variables applied to the sales page (and the admin preview) ────────

const BUTTON_RADIUS: Record<ButtonShape, string> = { square: "2px", rounded: "12px", pill: "9999px" };
const CARD_RADIUS: Record<ButtonShape, string> = { square: "4px", rounded: "16px", pill: "24px" };
const INPUT_RADIUS: Record<ButtonShape, string> = { square: "2px", rounded: "12px", pill: "22px" };
const SECTION_Y: Record<SectionSpacing, string> = { compact: "1.75rem", comfortable: "2.5rem", spacious: "4rem" };

/** CSS custom properties for a theme. Font stack comes from fontStack(). */
export function themeCssVars(theme: ResolvedTheme, fontStack: string): Record<string, string> {
  const { primary, accent, background: bg, text } = theme;
  return {
    "--product-primary": primary,
    "--product-accent": accent,
    "--product-bg": bg,
    "--product-text": text,
    "--product-font": fontStack,
    "--product-on-primary": readableOn(primary),
    "--product-on-accent": readableOn(accent),
    "--product-muted": mix(text, bg, 0.72),
    "--product-subtle": mix(text, bg, 0.55),
    "--product-surface": mix(text, bg, 0.04),
    "--product-border": mix(text, bg, 0.14),
    "--product-primary-soft": mix(primary, bg, 0.08),
    "--product-primary-line": mix(primary, bg, 0.3),
    "--sp-radius-btn": BUTTON_RADIUS[theme.buttonShape],
    "--sp-radius-card": CARD_RADIUS[theme.buttonShape],
    "--sp-radius-input": INPUT_RADIUS[theme.buttonShape],
    "--sp-card-shadow": theme.cardStyle === "shadow" ? "0 6px 20px rgba(0, 0, 0, 0.08)" : "none",
    "--sp-card-border": theme.cardStyle === "shadow" ? mix(text, bg, 0.06) : mix(text, bg, 0.14),
    "--sp-section-y": SECTION_Y[theme.spacing],
  };
}
