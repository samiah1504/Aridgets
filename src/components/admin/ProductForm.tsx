"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasPerm } from "@/lib/permissions";
import { SERIOUS_BUYER_DEFAULTS } from "@/lib/config";
import { NIGERIAN_STATES } from "@/lib/constants/states";
import type { Database } from "@/types/database";
import type { ProductContent, ProductTheme, SectionConfig, TemplateType } from "@/types";
import VariationsEditor from "./VariationsEditor";
import MediaManager from "./MediaManager";

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

function StringList({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...value];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-gray-300 hover:text-red-400 transition text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
      >
        + Add item
      </button>
    </div>
  );
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

  const canPublish = hasPerm(permissions, "products.publish");
  const canEditTracking = hasPerm(permissions, "tracking.edit");
  const visibleTabs = TABS.filter((t) => t !== "Tracking" || canEditTracking);

  const content = product.content as ProductContent;
  const theme = product.theme as ProductTheme;
  const sections = product.sections as SectionConfig[];

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
    setSaving(true);
    setError("");
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
        content: product.content,
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
        <Field label="WhatsApp number" hint="Optional — for order confirmation messages">
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
        <p className="text-sm text-gray-500">Choose the visual template for this product's sales page.</p>
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
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Hero</h3>
          <div className="space-y-4">
            <Field label="Announcement bar text">
              <FormInput value={content.announcementBar ?? ""} onChange={(v) => setContent({ announcementBar: v })} placeholder="Pay on Delivery · Free Shipping" />
            </Field>
            <Field label="Eyebrow (small text above headline)">
              <FormInput value={content.eyebrow ?? ""} onChange={(v) => setContent({ eyebrow: v })} />
            </Field>
            <Field label="Headline">
              <FormTextarea value={content.headline ?? ""} onChange={(v) => setContent({ headline: v })} rows={2} />
            </Field>
            <Field label="Sub-headline">
              <FormTextarea value={content.subhead ?? ""} onChange={(v) => setContent({ subhead: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Star rating (1–5)">
                <FormInput type="number" value={content.starRating ?? 5} onChange={(v) => setContent({ starRating: Number(v) })} />
              </Field>
              <Field label="CTA button text">
                <FormInput value={content.ctaText ?? ""} onChange={(v) => setContent({ ctaText: v })} placeholder="Order Now" />
              </Field>
            </div>
            <Field label="Trust row items">
              <StringList value={content.trustRow ?? []} onChange={(v) => setContent({ trustRow: v })} placeholder="e.g. Pay on Delivery" />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Problem</h3>
          <Field label="Problem text">
            <FormTextarea value={content.problemText ?? ""} onChange={(v) => setContent({ problemText: v })} rows={4} />
          </Field>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Benefits</h3>
          <div className="space-y-3">
            {(content.benefits ?? []).map((b, i) => (
              <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={b.icon ?? "✓"}
                  onChange={(e) => {
                    const next = [...(content.benefits ?? [])];
                    next[i] = { ...next[i], icon: e.target.value };
                    setContent({ benefits: next });
                  }}
                  className="w-10 border border-gray-200 rounded px-2 py-1.5 text-sm text-center outline-none"
                />
                <input
                  type="text"
                  value={b.text}
                  onChange={(e) => {
                    const next = [...(content.benefits ?? [])];
                    next[i] = { ...next[i], text: e.target.value };
                    setContent({ benefits: next });
                  }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setContent({ benefits: (content.benefits ?? []).filter((_, j) => j !== i) })}
                  className="text-gray-300 hover:text-red-400 transition text-xl leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setContent({ benefits: [...(content.benefits ?? []), { icon: "✓", text: "" }] })}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              + Add benefit
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">How It Works</h3>
          <div className="space-y-3">
            {(content.howItWorksSteps ?? []).map((step, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => {
                      const next = [...(content.howItWorksSteps ?? [])];
                      next[i] = { ...next[i], title: e.target.value };
                      setContent({ howItWorksSteps: next });
                    }}
                    placeholder="Step title"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setContent({ howItWorksSteps: (content.howItWorksSteps ?? []).filter((_, j) => j !== i) })}
                    className="text-gray-300 hover:text-red-400 transition text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={step.description}
                  onChange={(e) => {
                    const next = [...(content.howItWorksSteps ?? [])];
                    next[i] = { ...next[i], description: e.target.value };
                    setContent({ howItWorksSteps: next });
                  }}
                  rows={2}
                  placeholder="Step description"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition resize-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setContent({ howItWorksSteps: [...(content.howItWorksSteps ?? []), { title: "", description: "" }] })}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              + Add step
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Features & Specs</h3>
          <StringList value={content.featuresSpecs ?? []} onChange={(v) => setContent({ featuresSpecs: v })} placeholder="e.g. Material: Premium neoprene" />
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Testimonials</h3>
          <div className="space-y-3">
            {(content.testimonials ?? []).map((t, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => {
                      const next = [...(content.testimonials ?? [])];
                      next[i] = { ...next[i], name: e.target.value };
                      setContent({ testimonials: next });
                    }}
                    placeholder="Name"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                  <input
                    type="text"
                    value={t.location}
                    onChange={(e) => {
                      const next = [...(content.testimonials ?? [])];
                      next[i] = { ...next[i], location: e.target.value };
                      setContent({ testimonials: next });
                    }}
                    placeholder="Location"
                    className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                  <select
                    value={t.rating}
                    onChange={(e) => {
                      const next = [...(content.testimonials ?? [])];
                      next[i] = { ...next[i], rating: Number(e.target.value) };
                      setContent({ testimonials: next });
                    }}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  >
                    {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n}★</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setContent({ testimonials: (content.testimonials ?? []).filter((_, j) => j !== i) })}
                    className="text-gray-300 hover:text-red-400 transition text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={t.text}
                  onChange={(e) => {
                    const next = [...(content.testimonials ?? [])];
                    next[i] = { ...next[i], text: e.target.value };
                    setContent({ testimonials: next });
                  }}
                  rows={2}
                  placeholder="Review text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition resize-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setContent({ testimonials: [...(content.testimonials ?? []), { name: "", location: "", rating: 5, text: "" }] })}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              + Add testimonial
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Urgency & Guarantee</h3>
          <div className="space-y-4">
            <Field label="Urgency text">
              <FormInput value={content.urgencyText ?? ""} onChange={(v) => setContent({ urgencyText: v })} placeholder="Only 37 units left in stock..." />
            </Field>
            <Field label="Guarantee text">
              <FormTextarea value={content.guaranteeText ?? ""} onChange={(v) => setContent({ guaranteeText: v })} />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">FAQ</h3>
          <div className="space-y-3">
            {(content.faq ?? []).map((item, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => {
                      const next = [...(content.faq ?? [])];
                      next[i] = { ...next[i], question: e.target.value };
                      setContent({ faq: next });
                    }}
                    placeholder="Question"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setContent({ faq: (content.faq ?? []).filter((_, j) => j !== i) })}
                    className="text-gray-300 hover:text-red-400 transition text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={item.answer}
                  onChange={(e) => {
                    const next = [...(content.faq ?? [])];
                    next[i] = { ...next[i], answer: e.target.value };
                    setContent({ faq: next });
                  }}
                  rows={2}
                  placeholder="Answer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition resize-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setContent({ faq: [...(content.faq ?? []), { question: "", answer: "" }] })}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              + Add FAQ
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Order Form & Footer</h3>
          <div className="space-y-4">
            <Field label="Order form title">
              <FormInput value={content.orderFormTitle ?? ""} onChange={(v) => setContent({ orderFormTitle: v })} />
            </Field>
            <Field label="Success headline">
              <FormInput value={content.orderSuccessHeadline ?? ""} onChange={(v) => setContent({ orderSuccessHeadline: v })} />
            </Field>
            <Field label="Success message" hint="Use {total} to insert the order total">
              <FormTextarea value={content.orderSuccessBody ?? ""} onChange={(v) => setContent({ orderSuccessBody: v })} />
            </Field>
            <Field label="Footer text">
              <FormInput value={content.footerText ?? ""} onChange={(v) => setContent({ footerText: v })} />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Serious Buyer Notice</h3>
          <div className="space-y-4">
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
          </div>
        </section>
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
      <div className="flex items-center justify-between mb-6 gap-4">
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
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition -mb-px border-b-2 ${
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
