import { APP_NAME } from "@/lib/config";
import { activePurchaseOptions, lowestPrice } from "@/lib/purchaseOptions";
import AnnouncementBar from "@/components/sections/AnnouncementBar";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Benefits from "@/components/sections/Benefits";
import MediaGallery from "@/components/sections/MediaGallery";
import ProductDetails from "@/components/sections/ProductDetails";
import HowItWorks from "@/components/sections/HowItWorks";
import FeaturesSpecs from "@/components/sections/FeaturesSpecs";
import SocialProof from "@/components/sections/SocialProof";
import Urgency from "@/components/sections/Urgency";
import Guarantee from "@/components/sections/Guarantee";
import FAQ from "@/components/sections/FAQ";
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
        <MediaGallery media={media} productName={product.name} />
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

  return (
    <>
      {sections
        .filter((s) => s.enabled)
        .map((s) =>
          sectionMap[s.key] ? <div key={s.key}>{sectionMap[s.key]}</div> : null
        )}
      <footer className="text-center py-8 text-xs opacity-50 px-4 space-y-1">
        {content.footerText && <p>{content.footerText}</p>}
        <p>Powered by {APP_NAME}</p>
      </footer>
    </>
  );
}
