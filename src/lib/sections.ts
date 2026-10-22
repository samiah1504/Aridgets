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
