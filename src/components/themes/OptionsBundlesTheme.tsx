import { APP_NAME } from "@/lib/config";
import { activePurchaseOptions, lowestPrice } from "@/lib/purchaseOptions";
import { displaySections, orderCtaAnchors } from "@/lib/sections";
import AnnouncementBar from "@/components/sections/AnnouncementBar";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Benefits from "@/components/sections/Benefits";
import MediaStack from "@/components/sections/MediaStack";
import ProductDetails from "@/components/sections/ProductDetails";
import HowItWorks from "@/components/sections/HowItWorks";
import FeaturesSpecs from "@/components/sections/FeaturesSpecs";
import SocialProof from "@/components/sections/SocialProof";
import Urgency from "@/components/sections/Urgency";
import Guarantee from "@/components/sections/Guarantee";
import FAQ from "@/components/sections/FAQ";
import OrderCta from "@/components/sections/OrderCta";
import VariantAwareOrderForm from "./VariantAwareOrderForm";
import type { ThemeProps } from "./GadgetTheme";

// Product Options & Bundles: a generic template for any product sold in
// several purchasing options (sets, bundles, packages) with their own prices.
// Everything product-specific comes from the admin configuration.
export default function OptionsBundlesTheme({
  product, content, theme, sections, media, tracking, delivery, today,
}: ThemeProps) {
  const purchaseOptions = activePurchaseOptions(content);
  const fromPrice = lowestPrice(purchaseOptions) ?? product.price;
  const pricesVary = new Set(purchaseOptions.map((o) => o.price)).size > 1;

  // Media marked "Top of page" (hero slot) opens the page, pictures and videos
  // alike; with nothing marked, the first picture goes there. Everything else
  // is shown in the gallery section. Each item stands alone, uncropped.
  const ordered = [...media].sort((a, b) => a.sort_order - b.sort_order);
  const marked = ordered.filter((m) => m.slot === "hero");
  const firstImage = ordered.find((m) => m.kind === "image");
  const topMedia = marked.length ? marked : firstImage ? [firstImage] : [];
  const galleryMedia = ordered.filter((m) => !topMedia.includes(m));

  const sectionMap: Record<string, React.ReactNode> = {
    announcementBar: <AnnouncementBar text={content.announcementBar} />,
    hero: (
      <Hero
        eyebrow={content.eyebrow}
        headline={content.headline}
        subhead={content.subhead}
        starRating={content.starRating}
        ctaText={content.ctaText}
        trustRow={content.trustRow}
        price={fromPrice}
        pricePrefix={pricesVary ? "From" : undefined}
      />
    ),
    problem: <Problem text={content.problemText} />,
    benefits: <Benefits items={content.benefits} />,
    // Product description, materials, dimensions and delivery info follow the gallery
    mediaGallery: (
      <>
        {galleryMedia.length > 0 && (
          <section className="px-4 sp-section">
            <div className="max-w-lg mx-auto">
              <MediaStack items={galleryMedia} productName={product.name} />
            </div>
          </section>
        )}
        <ProductDetails
          description={content.productDescription}
          material={content.material}
          dimensions={content.dimensions}
          deliveryInfo={content.deliveryInfo}
        />
      </>
    ),
    howItWorks: <HowItWorks steps={content.howItWorksSteps} />,
    featuresSpecs: <FeaturesSpecs items={content.featuresSpecs} />,
    socialProof: <SocialProof testimonials={content.testimonials} />,
    urgency: <Urgency text={content.urgencyText} hasCountdown={content.hasCountdown} />,
    guarantee: <Guarantee text={content.guaranteeText} />,
    faq: <FAQ items={content.faq} />,
    orderForm: (
      <VariantAwareOrderForm
        productId={product.id}
        productName={product.name}
        basePrice={fromPrice}
        options={[]}
        variants={[]}
        purchaseOptions={purchaseOptions}
        purchaseOptionsHeading={content.purchaseOptionsHeading}
        delivery={delivery}
        today={today}
        primaryColor={theme.primary}
        notice={content.seriousBuyer}
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
    ),
  };

  // Two extra order blocks between the content, besides the hero button and
  // the order form at the bottom
  const keys = displaySections(sections, "options_bundles");
  const [ctaAfterProduct, ctaAfterProof] = orderCtaAnchors(keys);
  const ctaProps = { options: purchaseOptions, ctaText: content.ctaText, fromPrice, pricesVary };
  const orderBlocks: Record<string, React.ReactNode> = {
    ...(ctaAfterProduct && {
      [ctaAfterProduct]: (
        <OrderCta
          {...ctaProps}
          heading={content.purchaseOptionsHeading || "Choose your option"}
          sub="Tap an option to order — pay when it's delivered."
        />
      ),
    }),
    ...(ctaAfterProof && {
      [ctaAfterProof]: (
        <OrderCta
          {...ctaProps}
          variant="compact"
          heading="Ready to order?"
          sub="It takes less than a minute. No payment until delivery."
          trustRow={content.trustRow}
        />
      ),
    }),
  };

  return (
    <>
      {keys.map((key, i) =>
        sectionMap[key] ? (
          <div key={key}>
            {/* Top-of-page media: right after the announcement bar, before the headline */}
            {i === keys.findIndex((k) => k !== "announcementBar") && topMedia.length > 0 && (
              <div className="px-4 pt-4 max-w-lg mx-auto">
                <MediaStack items={topMedia} productName={product.name} eager />
              </div>
            )}
            {sectionMap[key]}
            {orderBlocks[key]}
          </div>
        ) : null
      )}
      <footer className="text-center py-8 text-xs opacity-50 px-4 space-y-1">
        {content.footerText && <p>{content.footerText}</p>}
        <p>Powered by {APP_NAME}</p>
      </footer>
    </>
  );
}
