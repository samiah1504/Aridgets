"use client";

import { useEffect, useRef, useState } from "react";
import AnnouncementBar from "@/components/sections/AnnouncementBar";
import Hero from "@/components/sections/Hero";
import SocialProof from "@/components/sections/SocialProof";
import FAQ from "@/components/sections/FAQ";
import VariantAwareOrderForm from "@/components/themes/VariantAwareOrderForm";
import { activePurchaseOptions, lowestPrice, resolveDeliverySettings, todayInLagos } from "@/lib/purchaseOptions";
import { themeCssVars, type ResolvedTheme } from "@/lib/theme";
import { fontStack, fontVariablesClass } from "@/lib/fonts";
import type { ProductContent, PurchaseOption } from "@/types";

// Live theme preview built from the real sales page components, so what you
// see here is what the published page renders. Uses the page's own content
// where it exists and short samples where it doesn't.

const SAMPLE_OPTIONS: PurchaseOption[] = [
  { id: "sample-1", name: "Standard Set", description: "Everything you need to get started.", price: 45000, active: true, includes: ["Main item", "Free delivery"] },
  { id: "sample-2", name: "Complete Bundle", description: "Our most popular choice.", price: 65000, active: true, includes: ["Main item", "Accessories", "Free delivery"] },
];
const SAMPLE_FAQ = [
  { question: "When do I pay?", answer: "You pay when your order is delivered — no payment before delivery." },
  { question: "How long does delivery take?", answer: "Usually 1–4 working days depending on your location." },
];

const WIDTH = { desktop: 1120, mobile: 390 } as const;

interface Props {
  theme: ResolvedTheme;
  productName: string;
  price: number;
  content: ProductContent;
  templateType: string | null;
}

export default function ThemePreview({ theme, productName, price, content, templateType }: Props) {
  const [mode, setMode] = useState<keyof typeof WIDTH>("mobile");
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  // Fit the page width into the panel; never scroll sideways
  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const s = Math.min(1, o.clientWidth / WIDTH[mode]);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [mode]);

  const ownOptions = activePurchaseOptions(content);
  const options = ownOptions.length ? ownOptions : SAMPLE_OPTIONS;
  const faq = content.faq?.length ? content.faq.slice(0, 3) : SAMPLE_FAQ;
  const delivery = resolveDeliverySettings(content, templateType);
  const fromPrice = lowestPrice(options) ?? price;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-gray-900">Live preview</p>
        <div role="radiogroup" aria-label="Preview size" className="inline-flex rounded-lg bg-gray-100 p-1">
          {(["desktop", "mobile"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {m === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Updates as you change settings — nothing is saved until you click Save. Buttons work, but no order can be placed here.
      </p>

      <div
        ref={outer}
        className="rounded-xl border border-gray-200 bg-gray-100 overflow-hidden h-[var(--preview-h)]"
        style={{ "--preview-h": `${height}px` } as React.CSSProperties}
      >
        <div
          ref={inner}
          data-testid="theme-preview"
          className={`sp-page origin-top-left w-[var(--preview-w)] [transform:scale(var(--preview-scale))] [&_.sticky]:static ${fontVariablesClass} ${
            mode === "mobile" ? "mx-auto" : ""
          }`}
          style={{
            ...themeCssVars(theme, fontStack(theme.font)),
            "--preview-w": `${WIDTH[mode]}px`,
            "--preview-scale": String(scale),
          } as React.CSSProperties}
        >
          <AnnouncementBar text={content.announcementBar || "Free delivery nationwide · Pay on delivery"} />
          <Hero
            eyebrow={content.eyebrow || "New arrival"}
            headline={content.headline || productName}
            subhead={content.subhead || "A short sentence that tells customers why they will love this product."}
            starRating={content.starRating ?? 4.8}
            ctaText={content.ctaText}
            trustRow={content.trustRow?.length ? content.trustRow.slice(0, 3) : ["Pay on Delivery", "Quality Guaranteed"]}
            price={fromPrice}
            pricePrefix={new Set(options.map((o) => o.price)).size > 1 ? "From" : undefined}
          />
          <VariantAwareOrderForm
            preview
            productId="preview"
            productName={productName}
            basePrice={fromPrice}
            options={[]}
            variants={[]}
            purchaseOptions={options}
            purchaseOptionsHeading={content.purchaseOptionsHeading}
            delivery={delivery}
            today={todayInLagos()}
            notice={content.seriousBuyer}
            title={content.orderFormTitle}
            ctaText={content.ctaText}
          />
          {content.testimonials?.length ? <SocialProof testimonials={content.testimonials.slice(0, 2)} /> : null}
          <FAQ items={faq} />
          <footer className="text-center py-8 text-xs opacity-50 px-4">{content.footerText || productName}</footer>
        </div>
      </div>
    </div>
  );
}
