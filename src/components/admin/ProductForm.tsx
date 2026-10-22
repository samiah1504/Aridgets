"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasPerm } from "@/lib/permissions";
import { SERIOUS_BUYER_DEFAULTS } from "@/lib/config";
import type { Database } from "@/types/database";
import type { ProductContent, ProductTheme, SectionConfig, TemplateType } from "@/types";
import VariationsEditor from "./VariationsEditor";
import MediaManager from "./MediaManager";
import BulkField from "./BulkField";
import {
  formatBenefits,
  formatFaqs,
  formatSteps,
  formatStringList,
  formatTestimonials,
  parseBenefits,
  parseFaqs,
  parseSteps,
  parseStringList,
  parseTestimonials,
} from "@/lib/utils/bulkContent";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

const SECTION_LABELS: Record<string, string> = {
  announcementBar: "Announcement Bar",
  hero: "Hero",
  problem: "Problem",
  benefits: "Benefits",
  mediaGallery: "Media Gallery",
  howItWorks: "How It Works",
  featuresSpecs: "Features & Specs",
  socialProof: "Social Proof",
  urgency: "Urgency",
  guarantee: "Guarantee",
  faq: "FAQ",
  orderForm: "Order Form",
};

const FONTS = ["Inter", "Poppins", "Lato", "Montserrat", "Nunito", "Raleway"];

const TABS = ["Basic", "Design", "Theme", "Content", "Sections", "Tracking", "Media", "Variations"] as const;
type Tab = (typeof TABS)[number];

const TEMPLATE_TYPES: { value: TemplateType; label: string; description: string }[] = [
  { value: "gadget", label: "Gadget", description: "Tech-forward layout: dark hero, feature cards, bold CTA." },
  { value: "furniture", label: "Furniture", description: "Premium split-hero, serif typography, warm palette." },
  { value: "kids_toy", label: "Kids Toy", description: "Bright, playful layout with age badges and emoji benefits." },
  { value: "kids_fashion", label: "Kids Fashion", description: "Elegant fashion layout with large imagery and size selectors." },
];

// ─── Reusable field components (module-level — MUST stay outside ProductForm)
// Defining these inside the render function gives them new references on every
// render, which makes React unmount + remount inputs and loses keyboard focus.

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function FormInput({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
    />
  );
}

function FormTextarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition resize-none"
    />
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
        />
      </div>
    </div>
  );
}

function ContentSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-100 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

// Bulk-entry textareas, one per list-type content field
interface BulkText {
  trustRow: string;
  benefits: string;
  steps: string;
  features: string;
  testimonials: string;
  faq: string;
}

function toBulkText(c: ProductContent): BulkText {
  return {
    trustRow: formatStringList(c.trustRow),
    benefits: formatBenefits(c.benefits),
    steps: formatSteps(c.howItWorksSteps),
    features: formatStringList(c.featuresSpecs),
    testimonials: formatTestimonials(c.testimonials),
    faq: formatFaqs(c.faq),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  product: ProductRow;
  permissions: string[];
}

export default function ProductForm({ product: initial, permissions }: Props) {
  const [product, setProduct] = useState<ProductRow>(initial);
  const [activeTab, setActiveTab] = useState<Tab>("Basic");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [bulk, setBulk] = useState<BulkText>(() => toBulkText(initial.content as ProductContent));
  const [showContentErrors, setShowContentErrors] = useState(false);

  const canPublish = hasPerm(permissions, "products.publish");
  const canEditTracking = hasPerm(permissions, "tracking.edit");
  const visibleTabs = TABS.filter((t) => t !== "Tracking" || canEditTracking);

  const content = product.content as ProductContent;
  const theme = product.theme as ProductTheme;
  const sections = product.sections as SectionConfig[];

  // Parsed live from the textareas; written into content only on Save
  const parsed = useMemo(
    () => ({
      trustRow: parseStringList(bulk.trustRow),
      benefits: parseBenefits(bulk.benefits, content.benefits),
      steps: parseSteps(bulk.steps),
      features: parseStringList(bulk.features),
      testimonials: parseTestimonials(bulk.testimonials, content.testimonials),
      faq: parseFaqs(bulk.faq),
    }),
    [bulk, content.benefits, content.testimonials]
  );

  const starRating = content.starRating ?? 5;
  const starRatingError =
    !Number.isFinite(starRating) || starRating < 1 || starRating > 5
      ? "Star rating must be between 1 and 5"
      : "";

  const contentProblems = [
    ...(starRatingError ? [`Hero: ${starRatingError.toLowerCase()}`] : []),
    ...(parsed.steps.errors.length ? [`How It Works: ${parsed.steps.errors.length} line(s) to fix`] : []),
    ...(parsed.testimonials.errors.length
      ? [`Testimonials: ${parsed.testimonials.errors.length} line(s) to fix`]
      : []),
    ...(parsed.faq.errors.length ? [`FAQs: ${parsed.faq.errors.length} line(s) to fix`] : []),
  ];

  function setBulkField(key: keyof BulkText, value: string) {
    setBulk((b) => ({ ...b, [key]: value }));
    setSaved(false);
  }

  function setField<K extends keyof ProductRow>(key: K, value: ProductRow[K]) {
    setProduct((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  function setContent(updates: Partial<ProductContent>) {
    setProduct((p) => ({ ...p, content: { ...(p.content as ProductContent), ...updates } }));
    setSaved(false);
  }

  function setTheme(updates: Partial<ProductTheme>) {
    setProduct((p) => ({ ...p, theme: { ...(p.theme as ProductTheme), ...updates } }));
    setSaved(false);
  }

  function toggleSection(key: string) {
    const updated = sections.map((s) =>
      s.key === key ? { ...s, enabled: !s.enabled } : s
    );
    setField("sections", updated);
  }

  async function handleSave() {
    setError("");
    // Never save half-parsed content: the saved items stay intact and the
    // textareas keep the user's input so they can fix the flagged lines.
    if (contentProblems.length > 0) {
      setShowContentErrors(true);
      setActiveTab("Content");
      setError("Fix the highlighted content before saving");
      return;
    }
    setShowContentErrors(false);
    setSaving(true);
    const nextContent: ProductContent = {
      ...content,
      trustRow: parsed.trustRow.items,
      benefits: parsed.benefits.items,
      howItWorksSteps: parsed.steps.items,
      featuresSpecs: parsed.features.items,
      testimonials: parsed.testimonials.items,
      faq: parsed.faq.items,
    };
    const supabase = createClient();
    const { error: err } = await supabase
      .from("products")
      .update({
        name: product.name,
        slug: product.slug,
        price: product.price,
        compare_at_price: product.compare_at_price,
        whatsapp_number: product.whatsapp_number,
        show_on_homepage: product.show_on_homepage,
        theme: product.theme,
        content: nextContent,
        sections: product.sections,
        template_type: product.template_type as TemplateType,
        ...(canPublish ? { status: product.status } : {}),
        ...(canEditTracking
          ? {
              pixel_id: product.pixel_id,
              capi_access_token: product.capi_access_token,
              capi_test_event_code: product.capi_test_event_code,
            }
          : {}),
      })
      .eq("id", product.id);

    if (err) {
      setError(err.message);
    } else {
      setProduct((p) => ({ ...p, content: nextContent }));
      setSaved(true);
    }
    setSaving(false);
  }

  // ─── tab content ─────────────────────────────────────────────────────────

  const tabContent: Record<Tab, React.ReactNode> = {
    Basic: (
      <div className="space-y-5">
        <Field label="Product name">
          <FormInput value={product.name} onChange={(v) => setField("name", v)} />
        </Field>
        <Field label="Slug" hint="Used in the URL: /p/your-slug">
          <FormInput value={product.slug} onChange={(v) => setField("slug", v.toLowerCase().replace(/\s+/g, "-"))} />
        </Field>
        <Field
          label="Status"
          hint={canPublish ? undefined : "You don't have permission to publish or unpublish"}
        >
          <select
            value={product.status}
            disabled={!canPublish}
            onChange={(e) => setField("status", e.target.value as ProductRow["status"])}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (NGN)" hint="In naira, e.g. 15000">
            <FormInput type="number" value={product.price} onChange={(v) => setField("price", Number(v))} />
          </Field>
          <Field label="Compare-at price">
            <FormInput type="number" value={product.compare_at_price ?? ""} onChange={(v) => setField("compare_at_price", v ? Number(v) : null)} />
          </Field>
        </div>
        <Field label="WhatsApp number" hint="Shows a floating 'Chat with us' WhatsApp button on the sales page. Leave empty to hide it.">
          <FormInput value={product.whatsapp_number ?? ""} onChange={(v) => setField("whatsapp_number", v || null)} placeholder="+2348012345678" />
        </Field>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={product.show_on_homepage}
            onChange={(e) => setField("show_on_homepage", e.target.checked)}
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="text-sm text-gray-700 font-medium">Show on homepage</span>
          <span className="text-xs text-gray-400">Appears in the public product showcase when status is Live</span>
        </label>
      </div>
    ),

    Design: (
      <div className="space-y-5">
        <p className="text-sm text-gray-500">Choose the visual template for this product&apos;s sales page.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATE_TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                (product.template_type as string) === t.value
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="template_type"
                value={t.value}
                checked={(product.template_type as string) === t.value}
                onChange={() => { setField("template_type", t.value); setSaved(false); }}
                className="mt-0.5 accent-indigo-600 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-gray-800">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    ),

    Theme: (
      <div className="space-y-5">
        <p className="text-sm text-gray-500">These colours style your sales page.</p>
        <div className="grid grid-cols-2 gap-4">
          <ColorField label="Primary colour" value={theme.primary} onChange={(v) => setTheme({ primary: v })} />
          <ColorField label="Accent colour" value={theme.accent} onChange={(v) => setTheme({ accent: v })} />
          <ColorField label="Background" value={theme.background} onChange={(v) => setTheme({ background: v })} />
          <ColorField label="Text colour" value={theme.text} onChange={(v) => setTheme({ text: v })} />
        </div>
        <Field label="Font">
          <select
            value={theme.font}
            onChange={(e) => setTheme({ font: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          >
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <div
          className="rounded-xl border-2 p-4 text-sm font-medium"
          style={{ borderColor: theme.primary, backgroundColor: theme.background, color: theme.text }}
        >
          Preview — <span style={{ color: theme.primary }}>primary</span> and{" "}
          <span style={{ color: theme.accent }}>accent</span> colours on this background.
        </div>
      </div>
    ),

    Content: (
      <div className="space-y-5">
        {showContentErrors && contentProblems.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">Nothing was saved — please fix:</p>
            <ul className="mt-1 list-disc list-inside text-sm text-red-600">
              {contentProblems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        )}

        <ContentSection title="Hero" description="The first thing visitors see at the top of the page.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Announcement bar text">
              <FormInput value={content.announcementBar ?? ""} onChange={(v) => setContent({ announcementBar: v })} placeholder="Pay on Delivery · Free Shipping" />
            </Field>
            <Field label="Eyebrow text" hint="Small text above the headline">
              <FormInput value={content.eyebrow ?? ""} onChange={(v) => setContent({ eyebrow: v })} />
            </Field>
          </div>
          <Field label="Headline">
            <FormTextarea value={content.headline ?? ""} onChange={(v) => setContent({ headline: v })} rows={2} />
          </Field>
          <Field label="Sub-headline">
            <FormTextarea value={content.subhead ?? ""} onChange={(v) => setContent({ subhead: v })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Star rating (1–5)">
              <FormInput type="number" value={content.starRating ?? 5} onChange={(v) => setContent({ starRating: Number(v) })} />
              {starRatingError && <p className="text-xs text-red-500 mt-1">{starRatingError}</p>}
            </Field>
            <Field label="CTA button text">
              <FormInput value={content.ctaText ?? ""} onChange={(v) => setContent({ ctaText: v })} placeholder="Order Now" />
            </Field>
          </div>
          <BulkField
            label="Trust row items"
            hint="One item per line."
            example={"Free Nationwide Delivery\nPay on Delivery\nQuality Guaranteed\nEasy Ordering"}
            value={bulk.trustRow}
            onChange={(v) => setBulkField("trustRow", v)}
            count={parsed.trustRow.items.length}
            noun={["trust item", "trust items"]}
            rows={4}
          />
        </ContentSection>

        <ContentSection title="Problem" description="Describe the pain your product solves.">
          <Field label="Problem text">
            <FormTextarea value={content.problemText ?? ""} onChange={(v) => setContent({ problemText: v })} rows={4} />
          </Field>
        </ContentSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ContentSection title="Benefits">
            <BulkField
              label="Benefits"
              hint="One benefit per line. Shown in the same order."
              example={"Strong and Durable Construction\nSpace-Saving Design\nComfortable Sleeping Space\nEasy to Maintain"}
              value={bulk.benefits}
              onChange={(v) => setBulkField("benefits", v)}
              count={parsed.benefits.items.length}
              noun={["benefit", "benefits"]}
            />
          </ContentSection>

          <ContentSection title="How It Works">
            <BulkField
              label="Steps"
              hint="One step per line, in order. Optional: add a description after a | (Title | Description)."
              example={"Choose your preferred product.\nComplete the order form.\nConfirm your delivery details.\nReceive your order at your doorstep."}
              value={bulk.steps}
              onChange={(v) => setBulkField("steps", v)}
              count={parsed.steps.items.length}
              noun={["step", "steps"]}
              errors={parsed.steps.errors}
            />
          </ContentSection>
        </div>

        <ContentSection title="Features & Specifications">
          <BulkField
            label="Features & specifications"
            hint="One item per line. Use “Label: Value” for specs."
            example={"Material: Heavy-Duty Metal\nBed Type: Double-Decker Bunk Bed\nFinish: Premium Powder Coating\nDelivery: Nationwide"}
            value={bulk.features}
            onChange={(v) => setBulkField("features", v)}
            count={parsed.features.items.length}
            noun={["item", "items"]}
          />
        </ContentSection>

        <ContentSection title="Testimonials">
          <BulkField
            label="Testimonials (Name | Location | Rating 1–5 | Text — one per line)"
            hint="Separate the four parts with |. Rating is a whole number from 1 to 5. The text may contain more | characters."
            example={"Amina | Lagos | 5 | I love the quality of this product. Delivery was fast and professional.\nFatima | Abuja | 5 | Excellent product. It is exactly what I ordered.\nKhadijah | Ilorin | 4 | Good quality and great value for money."}
            value={bulk.testimonials}
            onChange={(v) => setBulkField("testimonials", v)}
            count={parsed.testimonials.items.length}
            noun={["testimonial", "testimonials"]}
            errors={parsed.testimonials.errors}
            rows={8}
          />
        </ContentSection>

        <ContentSection title="Urgency & Guarantee">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Urgency text">
              <FormTextarea value={content.urgencyText ?? ""} onChange={(v) => setContent({ urgencyText: v })} placeholder="Only 37 units left in stock..." />
            </Field>
            <Field label="Guarantee text">
              <FormTextarea value={content.guaranteeText ?? ""} onChange={(v) => setContent({ guaranteeText: v })} />
            </Field>
          </div>
        </ContentSection>

        <ContentSection title="FAQ">
          <BulkField
            label="FAQs (Question | Answer — one per line)"
            hint="Everything before the first | is the question; everything after it is the answer."
            example={"Is this product suitable for office use? | Yes, it is designed for everyday office use.\nIs payment on delivery available? | Yes, payment on delivery is available in supported locations.\nHow long does delivery take? | Delivery times depend on your location."}
            value={bulk.faq}
            onChange={(v) => setBulkField("faq", v)}
            count={parsed.faq.items.length}
            noun={["FAQ", "FAQs"]}
            errors={parsed.faq.errors}
            rows={8}
          />
        </ContentSection>

        <ContentSection title="Order Form & Footer">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Order form title">
              <FormInput value={content.orderFormTitle ?? ""} onChange={(v) => setContent({ orderFormTitle: v })} />
            </Field>
            <Field label="Success headline">
              <FormInput value={content.orderSuccessHeadline ?? ""} onChange={(v) => setContent({ orderSuccessHeadline: v })} />
            </Field>
          </div>
          <Field label="Success message" hint="Use {total} to insert the order total">
            <FormTextarea value={content.orderSuccessBody ?? ""} onChange={(v) => setContent({ orderSuccessBody: v })} />
          </Field>
          <Field label="Footer text">
            <FormInput value={content.footerText ?? ""} onChange={(v) => setContent({ footerText: v })} />
          </Field>
        </ContentSection>

        <ContentSection title="Serious Buyer Notice">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={content.seriousBuyer?.enabled !== false}
              onChange={(e) =>
                setContent({ seriousBuyer: { ...content.seriousBuyer, enabled: e.target.checked } })
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700 font-medium">Show notice above the order form</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={content.seriousBuyer?.required !== false}
              onChange={(e) =>
                setContent({ seriousBuyer: { ...content.seriousBuyer, required: e.target.checked } })
              }
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700 font-medium">Customer must tick the checkbox before ordering</span>
          </label>
          <Field label="Heading">
            <FormInput
              value={content.seriousBuyer?.heading ?? ""}
              onChange={(v) => setContent({ seriousBuyer: { ...content.seriousBuyer, heading: v } })}
              placeholder={SERIOUS_BUYER_DEFAULTS.heading}
            />
          </Field>
          <Field label="Message">
            <FormTextarea
              value={content.seriousBuyer?.message ?? ""}
              onChange={(v) => setContent({ seriousBuyer: { ...content.seriousBuyer, message: v } })}
              placeholder={SERIOUS_BUYER_DEFAULTS.message}
            />
          </Field>
          <Field label="Checkbox wording">
            <FormInput
              value={content.seriousBuyer?.checkboxText ?? ""}
              onChange={(v) => setContent({ seriousBuyer: { ...content.seriousBuyer, checkboxText: v } })}
              placeholder={SERIOUS_BUYER_DEFAULTS.checkboxText}
            />
          </Field>
          <p className="text-xs text-gray-400">
            Leave a field empty to use the default wording shown as placeholder.
          </p>
        </ContentSection>

        <ContentSection title="Recent Orders Popup">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={content.recentOrdersEnabled !== false}
              onChange={(e) => setContent({ recentOrdersEnabled: e.target.checked })}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700 font-medium">Show recent-order notifications on the sales page</span>
          </label>
          <p className="text-xs text-gray-400">
            A small popup in the bottom-left corner showing real recent orders (first name, city
            and product only). No fake orders — it stays hidden until you have real ones.
          </p>
        </ContentSection>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-1">
          {saved && <span className="text-sm text-green-600 font-medium text-center">Saved ✓</span>}
          {error && <span className="text-sm text-red-500 text-center">{error}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-indigo-600 text-white text-sm font-semibold px-6 py-3 sm:py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save content"}
          </button>
        </div>
      </div>
    ),

    Sections: (
      <div className="space-y-2">
        <p className="text-sm text-gray-500 mb-4">Toggle which sections appear on the sales page.</p>
        {sections.map((s) => (
          <label
            key={s.key}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-indigo-200 transition"
          >
            <span className="text-sm font-medium">{SECTION_LABELS[s.key] ?? s.key}</span>
            <div
              onClick={() => toggleSection(s.key)}
              className={`relative w-10 h-5 rounded-full transition-colors ${s.enabled ? "bg-indigo-600" : "bg-gray-200"}`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${s.enabled ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </div>
          </label>
        ))}
      </div>
    ),

    Tracking: (
      <div className="space-y-5">
        <p className="text-sm text-gray-500">
          Set your Meta Pixel ID and CAPI token to enable tracking. The token is stored securely and never sent to the browser.
        </p>
        <Field label="Meta Pixel ID">
          <FormInput value={product.pixel_id ?? ""} onChange={(v) => setField("pixel_id", v || null)} placeholder="1234567890123456" />
        </Field>
        <Field label="CAPI Access Token" hint="Conversions API token from your Meta Events Manager">
          <input
            type="password"
            value={product.capi_access_token ?? ""}
            onChange={(e) => setField("capi_access_token", e.target.value || null)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition font-mono"
            autoComplete="off"
          />
        </Field>
        <Field label="Test event code" hint="From Meta Events Manager test events panel — remove when going live">
          <FormInput value={product.capi_test_event_code ?? ""} onChange={(v) => setField("capi_test_event_code", v || null)} placeholder="TEST12345" />
        </Field>
      </div>
    ),

    Media: (
      <div>
        <p className="text-sm text-gray-500 mb-5">
          Add images and videos for this product. Set one image as the Hero to show it first in the gallery.
          Changes take effect immediately — no need to click Save.
        </p>
        <MediaManager productId={product.id} />
      </div>
    ),

    Variations: (
      <div>
        <p className="text-sm text-gray-500 mb-5">
          Define options (e.g. Colour, Size) and generate variant combinations with individual prices and stock.
          Changes take effect immediately — no need to click Save.
        </p>
        <VariationsEditor productId={product.id} />
      </div>
    ),
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">/p/{product.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
          <a
            href={`/p/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-gray-700 transition"
          >
            Preview ↗
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto overflow-y-hidden">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition -mb-px border-b-2 whitespace-nowrap ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
