// Bulk-entry helpers for the product Content editor.
// Each list-type field in ProductContent is edited as one textarea:
// format*() turns saved items into lines, parse*() turns lines back into the
// exact structures the sales-page themes already render.

import type { ProductContent } from "@/types";

type Benefit = NonNullable<ProductContent["benefits"]>[number];
type Step = NonNullable<ProductContent["howItWorksSteps"]>[number];
type Testimonial = NonNullable<ProductContent["testimonials"]>[number];
type Faq = NonNullable<ProductContent["faq"]>[number];

export interface LineError {
  line: number; // 1-based line number in the textarea, blank lines included
  message: string;
}

export interface ParseResult<T> {
  items: T[];
  errors: LineError[];
}

const DEFAULT_BENEFIT_ICON = "✓";

// Collapse any line breaks inside a saved value so one item stays one line
function oneLine(value: string | undefined | null): string {
  return (value ?? "").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/** Non-empty, trimmed lines with their 1-based textarea line numbers. */
function lines(text: string): { line: number; value: string }[] {
  return text
    .split(/\r?\n/)
    .map((value, i) => ({ line: i + 1, value: value.trim() }))
    .filter((l) => l.value !== "");
}

/** Splits at the first `count` pipes; the last part keeps any further pipes. */
function splitPipes(value: string, count: number): string[] {
  const parts: string[] = [];
  let rest = value;
  for (let i = 0; i < count; i++) {
    const at = rest.indexOf("|");
    if (at === -1) break;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at + 1);
  }
  parts.push(rest.trim());
  return parts;
}

// ── Plain lists: trust row, features & specs ────────────────────────────────

export function formatStringList(items: string[] | undefined): string {
  return (items ?? []).map(oneLine).filter(Boolean).join("\n");
}

export function parseStringList(text: string): ParseResult<string> {
  return { items: lines(text).map((l) => l.value), errors: [] };
}

// ── Benefits: one per line; icons kept for unchanged benefits ───────────────

export function formatBenefits(items: Benefit[] | undefined): string {
  return formatStringList((items ?? []).map((b) => b.text));
}

export function parseBenefits(text: string, saved: Benefit[] = []): ParseResult<Benefit> {
  const icons = new Map(saved.map((b) => [oneLine(b.text), b.icon]));
  return {
    items: lines(text).map((l) => ({
      icon: icons.get(l.value) ?? DEFAULT_BENEFIT_ICON,
      text: l.value,
    })),
    errors: [],
  };
}

// ── How It Works: "Step" or "Step title | Description" ──────────────────────

export function formatSteps(items: Step[] | undefined): string {
  return (items ?? [])
    .map((s) => {
      const title = oneLine(s.title);
      const description = oneLine(s.description);
      if (!title) return description;
      return description ? `${title} | ${description}` : title;
    })
    .filter(Boolean)
    .join("\n");
}

export function parseSteps(text: string): ParseResult<Step> {
  const items: Step[] = [];
  const errors: LineError[] = [];
  for (const l of lines(text)) {
    const [title, description = ""] = splitPipes(l.value, 1);
    if (!title) {
      errors.push({ line: l.line, message: "Step text is missing before the |" });
      continue;
    }
    items.push({ title, description });
  }
  return { items, errors };
}

// ── Testimonials: "Name | Location | Rating | Text" ─────────────────────────

export function formatTestimonials(items: Testimonial[] | undefined): string {
  return (items ?? [])
    // Fully blank rows were never shown on the page (empty "Add" clicks)
    .filter((t) => oneLine(t.name) || oneLine(t.location) || oneLine(t.text))
    .map((t) => `${oneLine(t.name)} | ${oneLine(t.location)} | ${t.rating} | ${oneLine(t.text)}`)
    .join("\n");
}

export function parseTestimonials(
  text: string,
  saved: Testimonial[] = []
): ParseResult<Testimonial> {
  const items: Testimonial[] = [];
  const errors: LineError[] = [];
  for (const l of lines(text)) {
    const parts = splitPipes(l.value, 3);
    if (parts.length < 4) {
      errors.push({
        line: l.line,
        message: `Needs 4 parts separated by | (Name | Location | Rating | Text) — found ${parts.length}`,
      });
      continue;
    }
    const [name, location, ratingRaw, body] = parts;
    const missing = [
      !name && "name",
      !location && "location",
      !ratingRaw && "rating",
      !body && "testimonial text",
    ].filter(Boolean);
    if (missing.length) {
      errors.push({ line: l.line, message: `Missing ${missing.join(", ")}` });
      continue;
    }
    const rating = Number(ratingRaw);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.push({
        line: l.line,
        message: `Rating must be a whole number from 1 to 5 — got "${ratingRaw}"`,
      });
      continue;
    }
    // Keep the photo of a testimonial that is otherwise unchanged
    const photo = saved.find(
      (t) => oneLine(t.name) === name && oneLine(t.text) === body && t.photo
    )?.photo;
    items.push({ name, location, rating, text: body, ...(photo ? { photo } : {}) });
  }
  return { items, errors };
}

// ── FAQ: "Question | Answer" (split at the first pipe only) ─────────────────

export function formatFaqs(items: Faq[] | undefined): string {
  return (items ?? [])
    .filter((f) => oneLine(f.question) || oneLine(f.answer))
    .map((f) => `${oneLine(f.question)} | ${oneLine(f.answer)}`)
    .join("\n");
}

export function parseFaqs(text: string): ParseResult<Faq> {
  const items: Faq[] = [];
  const errors: LineError[] = [];
  for (const l of lines(text)) {
    const parts = splitPipes(l.value, 1);
    if (parts.length < 2) {
      errors.push({ line: l.line, message: "Missing | between the question and the answer" });
      continue;
    }
    const [question, answer] = parts;
    if (!question || !answer) {
      errors.push({ line: l.line, message: `Missing ${!question ? "question" : "answer"}` });
      continue;
    }
    items.push({ question, answer });
  }
  return { items, errors };
}
