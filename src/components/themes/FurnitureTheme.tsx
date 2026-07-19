import SocialProof from "@/components/sections/SocialProof";
import FAQ from "@/components/sections/FAQ";
import Guarantee from "@/components/sections/Guarantee";
import Urgency from "@/components/sections/Urgency";
import VariantAwareOrderForm from "./VariantAwareOrderForm";
import { formatNGN } from "@/lib/utils/currency";
import type { ThemeProps } from "./GadgetTheme";

export default function FurnitureTheme({
  product, content, theme, sections, media, options, variants, tracking,
}: ThemeProps) {
  const enabled = new Set(sections.filter((s) => s.enabled).map((s) => s.key));

  const images = media
    .filter((m) => m.kind === "image")
    .sort((a, b) => a.sort_order - b.sort_order);
  const heroImg = images.find((m) => m.slot === "hero") ?? images[0];
  const galleryImgs = images.slice(0, 6);

  const specChips = [
    content.material && { label: "Material", value: content.material },
    content.dimensions && { label: "Dimensions", value: content.dimensions },
    content.deliveryInfo && { label: "Delivery", value: content.deliveryInfo },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      {/* ── Announcement bar ───────────────────────────────────────────────── */}
      {enabled.has("announcementBar") && content.announcementBar && (
        <div
          className="text-center py-2.5 px-4 text-sm font-medium tracking-wide"
          style={{ backgroundColor: "var(--product-primary)", color: "#fff" }}
        >
          {content.announcementBar}
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {enabled.has("hero") && (
        <section className="max-w-6xl mx-auto px-4 py-10 lg:py-16 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Text */}
          <div className="order-2 lg:order-1 mt-8 lg:mt-0">
            {content.eyebrow && (
              <p
                className="text-xs font-bold uppercase tracking-[0.2em] mb-4"
                style={{ color: "var(--product-primary)" }}
              >
                {content.eyebrow}
              </p>
            )}
            {content.headline && (
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-serif font-bold leading-tight mb-5">
                {content.headline}
              </h1>
            )}
            {content.subhead && (
              <p className="text-base lg:text-lg text-gray-500 leading-relaxed mb-7">
                {content.subhead}
              </p>
            )}
            {content.starRating !== undefined && (
              <div className="flex items-center gap-2 mb-6">
                <span className="text-amber-400 text-base leading-none">
                  {"★".repeat(Math.min(5, Math.max(0, Math.round(content.starRating))))}
                  {"☆".repeat(5 - Math.min(5, Math.max(0, Math.round(content.starRating))))}
                </span>
                <span className="text-sm text-gray-400">
                  {content.starRating.toFixed(1)} · Verified buyers
                </span>
              </div>
            )}
            <div className="flex items-baseline gap-4 mb-7">
              <span className="text-3xl font-bold" style={{ color: "var(--product-primary)" }}>
                {formatNGN(product.price)}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <>
                  <span className="text-xl text-gray-300 line-through">
                    {formatNGN(product.compare_at_price)}
                  </span>
                  <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Save {formatNGN(product.compare_at_price - product.price)}
                  </span>
                </>
              )}
            </div>
            <a
              href="#order"
              className="inline-block px-8 py-3.5 text-white font-semibold rounded-xl text-base shadow-md hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: "var(--product-primary)" }}
            >
              {content.ctaText ?? "Order Now — Pay on Delivery"}
            </a>
            {content.trustRow && content.trustRow.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-5 text-sm text-gray-400">
                {content.trustRow.map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span style={{ color: "var(--product-primary)" }}>✓</span>
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Image */}
          {heroImg && (
            <div className="order-1 lg:order-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImg.url}
                alt={heroImg.alt ?? product.name}
                className="w-full rounded-2xl object-cover aspect-[4/5] shadow-xl"
                loading="eager"
              />
            </div>
          )}
        </section>
      )}

      {/* ── Specs strip ─────────────────────────────────────────────────────── */}
      {specChips.length > 0 && (
        <section className="border-y border-gray-100 py-5">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-6">
            {specChips.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 font-medium">{label}:</span>
                <span className="font-semibold text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Problem ─────────────────────────────────────────────────────────── */}
      {enabled.has("problem") && content.problemText && (
        <section className="max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-lg text-gray-600 leading-relaxed italic">
            "{content.problemText}"
          </p>
        </section>
      )}

      {/* ── Benefits ────────────────────────────────────────────────────────── */}
      {enabled.has("benefits") && content.benefits && content.benefits.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.benefits.map((b, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl border border-gray-100">
                {b.icon && (
                  <span className="text-2xl shrink-0">{b.icon}</span>
                )}
                <p className="text-sm text-gray-700 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Media gallery ───────────────────────────────────────────────────── */}
      {enabled.has("mediaGallery") && galleryImgs.length > 1 && (
        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {galleryImgs.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt={img.alt ?? ""}
                className="w-full aspect-square object-cover rounded-xl"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ────────────────────────────────────────────────────── */}
      {enabled.has("howItWorks") && content.howItWorksSteps && content.howItWorksSteps.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-serif font-bold text-center mb-8">
            How It Works
          </h2>
          <ol className="space-y-6">
            {content.howItWorksSteps.map((step, i) => (
              <li key={i} className="flex gap-5 items-start">
                <span
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: "var(--product-primary)" }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-800">{step.title}</p>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Features & Specs ────────────────────────────────────────────────── */}
      {enabled.has("featuresSpecs") && content.featuresSpecs && content.featuresSpecs.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-serif font-bold text-center mb-6">Details</h2>
          <ul className="divide-y divide-gray-100">
            {content.featuresSpecs.map((item, i) => (
              <li key={i} className="py-3 text-sm text-gray-700">{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Urgency ─────────────────────────────────────────────────────────── */}
      {enabled.has("urgency") && (
        <Urgency text={content.urgencyText} hasCountdown={content.hasCountdown} />
      )}

      {/* ── Social proof ────────────────────────────────────────────────────── */}
      {enabled.has("socialProof") && (
        <SocialProof testimonials={content.testimonials} />
      )}

      {/* ── Guarantee ───────────────────────────────────────────────────────── */}
      {enabled.has("guarantee") && <Guarantee text={content.guaranteeText} />}

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      {enabled.has("faq") && <FAQ items={content.faq} />}

      {/* ── Order form ──────────────────────────────────────────────────────── */}
      {enabled.has("orderForm") && (
        <VariantAwareOrderForm
          productId={product.id}
          productName={product.name}
          basePrice={product.price}
          compareAtPrice={product.compare_at_price}
          options={options}
          variants={variants}
          primaryColor={theme.primary}
          title={content.orderFormTitle}
          successHeadline={content.orderSuccessHeadline}
          successBody={content.orderSuccessBody}
          ctaText={content.ctaText}
          pixelId={tracking.pixelId}
          fbclid={tracking.fbclid}
          utmSource={tracking.utmSource}
          utmMedium={tracking.utmMedium}
          utmCampaign={tracking.utmCampaign}
          utmContent={tracking.utmContent}
        />
      )}

      {content.footerText && (
        <footer className="text-center py-8 text-xs opacity-40 px-4">
          {content.footerText}
        </footer>
      )}
    </>
  );
}
