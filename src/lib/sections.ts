// Display order of sales page sections, shared by the published templates
// that follow the saved order and by the admin theme preview.

import type { SectionConfig, TemplateType } from "@/types";

/**
 * Enabled section keys in display order. The Options & Bundles template
 * always ends with the order form, so FAQs and other content sit above it
 * even if a page's saved order says otherwise.
 */
export function displaySections(
  sections: SectionConfig[] | null | undefined,
  templateType: TemplateType | string | null | undefined
): string[] {
  const keys = (sections ?? []).filter((s) => s.enabled).map((s) => s.key);
  if (templateType === "options_bundles" && keys.includes("orderForm")) {
    return [...keys.filter((k) => k !== "orderForm"), "orderForm"];
  }
  return keys;
}

// Where the extra in-page order blocks go: after the first enabled section
// of each preference list. Never directly before the order form (it would
// just repeat it) and never twice in the same spot.
const ORDER_CTA_SLOTS: string[][] = [
  ["mediaGallery", "benefits", "problem"],                  // after seeing the product
  ["socialProof", "guarantee", "urgency", "howItWorks", "featuresSpecs"], // after the reassurance
];

export function orderCtaAnchors(keys: string[]): string[] {
  const formAt = keys.indexOf("orderForm");
  if (formAt === -1) return [];
  const anchors: string[] = [];
  for (const slot of ORDER_CTA_SLOTS) {
    const key = slot.find((k) => {
      const i = keys.indexOf(k);
      return i !== -1 && i < formAt - 1 && !anchors.includes(k);
    });
    if (key) anchors.push(key);
  }
  return anchors;
}
