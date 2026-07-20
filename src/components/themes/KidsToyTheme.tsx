import { APP_NAME } from "@/lib/config";
import SocialProof from "@/components/sections/SocialProof";
import FAQ from "@/components/sections/FAQ";
import Guarantee from "@/components/sections/Guarantee";
import Urgency from "@/components/sections/Urgency";
import VariantAwareOrderForm from "./VariantAwareOrderForm";
import { formatNGN } from "@/lib/utils/currency";
import type { ThemeProps } from "./GadgetTheme";

export default function KidsToyTheme({
  product, content, theme, sections, media, options, variants, tracking,
}: ThemeProps) {
  const enabled = new Set(sections.filter((s) => s.enabled).map((s) => s.key));

  const images = media
    .filter((m) => m.kind === "image")
    .sort((a, b) => a.sort_order - b.sort_order);
  const heroImg = images.find((m) => m.slot === "hero") ?? images[0];
  const galleryImgs = images.slice(0, 6);

  return (
    <>
      {/* ── Announcement bar ───────────────────────────────────────────────── */}
      {enabled.has("announcementBar") && content.announcementBar && (
        <div
          className="text-center py-2.5 px-4 text-sm font-bold"
          style={{ backgroundColor: "var(--product-accent)", color: "#fff" }}
        >
          🎉 {content.announcementBar}
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {enabled.has("hero") && (
        <section
          className="px-4 pt-10 pb-12 text-center"
          style={{
            background: `linear-gradient(135deg, var(--product-primary) 0%, var(--product-accent) 100%)`,
          }}
        >
          <div className="max-w-lg mx-auto">
            {/* Age badge */}
            {content.ageRange && (
              <span className="inline-block bg-white/25 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                Ages {content.ageRange}
              </span>
            )}
            {content.eyebrow && !content.ageRange && (
              <p className="text-white/80 text-sm font-semibold uppercase tracking-widest mb-3">
                {content.eyebrow}
              </p>
            )}
            {content.headline && (
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
                {content.headline}
              </h1>
            )}
            {content.starRating !== undefined && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-yellow-300 text-xl">
                  {"★".repeat(Math.min(5, Math.max(0, Math.round(content.starRating))))}
                </span>
                <span className="text-white/75 text-sm">
                  {content.starRating.toFixed(1)} · Happy Kids ✓
                </span>
              </div>
            )}

            {/* Hero image */}
            {heroImg && (
              <div className="my-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImg.url}
                  alt={heroImg.alt ?? product.name}
                  className="mx-auto max-h-64 sm:max-h-80 object-contain drop-shadow-2xl"
                  loading="eager"
                />
              </div>
            )}

            {content.subhead && (
              <p className="text-white/85 text-base leading-relaxed mb-6">{content.subhead}</p>
            )}

            <div className="flex items-baseline justify-center gap-3 mb-6">
              <span className="text-3xl font-extrabold text-white">
                {formatNGN(product.price)}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-xl text-white/50 line-through">
                  {formatNGN(product.compare_at_price)}
                </span>
              )}
            </div>

            <a
              href="#order"
              className="inline-block bg-white font-extrabold text-lg px-8 py-3.5 rounded-3xl shadow-xl active:scale-95 transition-transform"
              style={{ color: "var(--product-primary)" }}
            >
              {content.ctaText ?? "Order Now — Pay on Delivery"} 🛒
            </a>

            {content.trustRow && content.trustRow.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-5">
                {content.trustRow.map((item, i) => (
                  <span key={i} className="text-white/80 text-sm flex items-center gap-1">
                    <span className="text-yellow-300">✓</span> {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Problem ─────────────────────────────────────────────────────────── */}
      {enabled.has("problem") && content.problemText && (
        <section className="max-w-2xl mx-auto px-4 py-10 text-center">
          <p className="text-base text-gray-600 leading-relaxed">{content.problemText}</p>
        </section>
      )}

      {/* ── Benefits ────────────────────────────────────────────────────────── */}
      {enabled.has("benefits") && content.benefits && content.benefits.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: "var(--product-primary)" }}>
            Why Kids Love It ❤️
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.benefits.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-3xl border-2 border-dashed"
                style={{ borderColor: "var(--product-primary)" + "40" }}
              >
                {b.icon && (
                  <span className="text-3xl shrink-0">{b.icon}</span>
                )}
                <p className="text-sm text-gray-700 leading-relaxed font-medium">{b.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ────────────────────────────────────────────────────── */}
      {enabled.has("howItWorks") && content.howItWorksSteps && content.howItWorksSteps.length > 0 && (
        <section
          className="px-4 py-10"
          style={{ backgroundColor: "var(--product-primary)" + "0d" }}
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: "var(--product-primary)" }}>
              Super Simple Steps 🌟
            </h2>
            <div className="space-y-5">
              {content.howItWorksSteps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start bg-white rounded-2xl p-4 shadow-sm">
                  <span
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-lg"
                    style={{ backgroundColor: "var(--product-accent)" }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-extrabold text-gray-800">{step.title}</p>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Media gallery ───────────────────────────────────────────────────── */}
      {enabled.has("mediaGallery") && galleryImgs.length > 1 && (
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-extrabold text-center mb-6" style={{ color: "var(--product-primary)" }}>
            See It In Action 📸
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {galleryImgs.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt={img.alt ?? ""}
                className="w-full aspect-square object-cover rounded-3xl border-4 border-white shadow-md"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Features & Specs ────────────────────────────────────────────────── */}
      {enabled.has("featuresSpecs") && content.featuresSpecs && content.featuresSpecs.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-extrabold text-center mb-6" style={{ color: "var(--product-primary)" }}>
            What's Included 🎁
          </h2>
          <ul className="space-y-3">
            {content.featuresSpecs.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="text-lg shrink-0" style={{ color: "var(--product-accent)" }}>⭐</span>
                {item}
              </li>
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

      <footer className="text-center py-8 text-xs opacity-50 px-4 space-y-1">
        {content.footerText && <p>{content.footerText}</p>}
        <p>Powered by {APP_NAME}</p>
      </footer>
    </>
  );
}
