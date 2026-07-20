import { APP_NAME } from "@/lib/config";
import SocialProof from "@/components/sections/SocialProof";
import FAQ from "@/components/sections/FAQ";
import Guarantee from "@/components/sections/Guarantee";
import Urgency from "@/components/sections/Urgency";
import VariantAwareOrderForm from "./VariantAwareOrderForm";
import { formatNGN } from "@/lib/utils/currency";
import type { ThemeProps } from "./GadgetTheme";

export default function KidsFashionTheme({
  product, content, theme, sections, media, options, variants, tracking,
}: ThemeProps) {
  const enabled = new Set(sections.filter((s) => s.enabled).map((s) => s.key));

  const images = media
    .filter((m) => m.kind === "image")
    .sort((a, b) => a.sort_order - b.sort_order);
  const heroImg = images.find((m) => m.slot === "hero") ?? images[0];
  const galleryImgs = images.slice(0, 6);

  const detailChips = [
    content.ageRange && { label: "Age", value: content.ageRange },
    content.material && { label: "Material", value: content.material },
    content.deliveryInfo && { label: "Delivery", value: content.deliveryInfo },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      {/* ── Announcement bar ───────────────────────────────────────────────── */}
      {enabled.has("announcementBar") && content.announcementBar && (
        <div
          className="text-center py-2 px-4 text-xs font-semibold tracking-widest uppercase"
          style={{ backgroundColor: "var(--product-primary)", color: "#fff" }}
        >
          {content.announcementBar}
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {enabled.has("hero") && (
        <section className="max-w-6xl mx-auto px-4 py-8 lg:py-14 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Image */}
          {heroImg ? (
            <div className="relative rounded-3xl overflow-hidden aspect-[3/4] shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImg.url}
                alt={heroImg.alt ?? product.name}
                className="w-full h-full object-cover"
                loading="eager"
              />
              {/* Overlay badge */}
              {product.compare_at_price && product.compare_at_price > product.price && (
                <div
                  className="absolute top-4 left-4 text-white text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: "var(--product-accent)" }}
                >
                  SALE
                </div>
              )}
            </div>
          ) : (
            <div
              className="rounded-3xl aspect-[3/4] flex items-center justify-center text-6xl"
              style={{ backgroundColor: "var(--product-primary)" + "15" }}
            >
              👗
            </div>
          )}

          {/* Text */}
          <div className="mt-8 lg:mt-0">
            {content.eyebrow && (
              <p
                className="text-xs font-semibold uppercase tracking-[0.25em] mb-4"
                style={{ color: "var(--product-accent)" }}
              >
                {content.eyebrow}
              </p>
            )}
            {content.ageRange && (
              <span
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4"
                style={{ backgroundColor: "var(--product-primary)" + "20", color: "var(--product-primary)" }}
              >
                Ages {content.ageRange}
              </span>
            )}
            {content.headline && (
              <h1 className="text-3xl lg:text-4xl font-bold leading-snug mb-4">
                {content.headline}
              </h1>
            )}
            {content.starRating !== undefined && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-amber-400 text-base">
                  {"★".repeat(Math.min(5, Math.max(0, Math.round(content.starRating))))}
                  {"☆".repeat(5 - Math.min(5, Math.max(0, Math.round(content.starRating))))}
                </span>
                <span className="text-sm text-gray-400">
                  {content.starRating.toFixed(1)}
                </span>
              </div>
            )}
            {content.subhead && (
              <p className="text-base text-gray-500 leading-relaxed mb-6">{content.subhead}</p>
            )}

            {/* Detail chips */}
            {detailChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {detailChips.map(({ label, value }) => (
                  <div key={label} className="text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                    <span className="text-gray-400">{label}: </span>
                    <span className="font-semibold text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold" style={{ color: "var(--product-primary)" }}>
                {formatNGN(product.price)}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <>
                  <span className="text-xl text-gray-300 line-through">
                    {formatNGN(product.compare_at_price)}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: "var(--product-accent)" }}
                  >
                    -{Math.round((1 - product.price / product.compare_at_price) * 100)}%
                  </span>
                </>
              )}
            </div>

            <a
              href="#order"
              className="block w-full text-center text-white font-bold py-4 rounded-2xl text-base shadow-md active:scale-95 transition-transform"
              style={{ backgroundColor: "var(--product-primary)" }}
            >
              {content.ctaText ?? "Order Now — Pay on Delivery"}
            </a>

            {content.trustRow && content.trustRow.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
                {content.trustRow.map((item, i) => (
                  <span key={i} className="text-xs text-gray-400 flex items-center gap-1">
                    <span style={{ color: "var(--product-primary)" }}>✓</span> {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Problem ─────────────────────────────────────────────────────────── */}
      {enabled.has("problem") && content.problemText && (
        <section className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-center text-base text-gray-500 leading-relaxed">{content.problemText}</p>
        </section>
      )}

      {/* ── Benefits ────────────────────────────────────────────────────────── */}
      {enabled.has("benefits") && content.benefits && content.benefits.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 py-4 border-b border-gray-100 last:border-0">
                {b.icon && <span className="text-xl shrink-0">{b.icon}</span>}
                <p className="text-sm text-gray-700 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Media gallery ───────────────────────────────────────────────────── */}
      {enabled.has("mediaGallery") && galleryImgs.length > 1 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImgs.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt={img.alt ?? ""}
                className="w-full aspect-[3/4] object-cover rounded-2xl"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ────────────────────────────────────────────────────── */}
      {enabled.has("howItWorks") && content.howItWorksSteps && content.howItWorksSteps.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-center mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {content.howItWorksSteps.map((step, i) => (
              <div key={i}>
                <span
                  className="block w-10 h-10 rounded-full mx-auto mb-3 text-white font-bold text-lg flex items-center justify-center"
                  style={{ backgroundColor: "var(--product-primary)" }}
                >
                  {i + 1}
                </span>
                <p className="font-semibold text-gray-800 mb-1">{step.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Features & Specs ────────────────────────────────────────────────── */}
      {enabled.has("featuresSpecs") && content.featuresSpecs && content.featuresSpecs.length > 0 && (
        <section
          className="px-4 py-8"
          style={{ backgroundColor: "var(--product-primary)" + "08" }}
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Product Details</h2>
            <ul className="space-y-2">
              {content.featuresSpecs.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="shrink-0 mt-0.5" style={{ color: "var(--product-accent)" }}>•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
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

      <footer className="text-center py-8 text-xs opacity-40 px-4 space-y-1">
        {content.footerText && <p>{content.footerText}</p>}
        <p>Powered by {APP_NAME}</p>
      </footer>
    </>
  );
}
