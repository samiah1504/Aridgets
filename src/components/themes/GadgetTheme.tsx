import { APP_NAME } from "@/lib/config";
import AnnouncementBar from "@/components/sections/AnnouncementBar";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Benefits from "@/components/sections/Benefits";
import MediaGallery from "@/components/sections/MediaGallery";
import HowItWorks from "@/components/sections/HowItWorks";
import FeaturesSpecs from "@/components/sections/FeaturesSpecs";
import SocialProof from "@/components/sections/SocialProof";
import Urgency from "@/components/sections/Urgency";
import Guarantee from "@/components/sections/Guarantee";
import FAQ from "@/components/sections/FAQ";
import VariantAwareOrderForm from "./VariantAwareOrderForm";
import type { ProductContent, ProductTheme, SectionConfig, ProductOption, ProductVariant } from "@/types";

interface MediaItem {
  id: string; kind: string; url: string; provider: string | null;
  slot: string; sort_order: number; alt: string | null;
}

export interface ThemeProps {
  product: {
    id: string;
    name: string;
    price: number;
    compare_at_price: number | null;
    pixel_id: string | null;
  };
  content: ProductContent;
  theme: ProductTheme;
  sections: SectionConfig[];
  media: MediaItem[];
  options: ProductOption[];
  variants: ProductVariant[];
  tracking: {
    pixelId?: string;
    fbclid?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
  };
}

export default function GadgetTheme({
  product, content, theme, sections, media, options, variants, tracking,
}: ThemeProps) {
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
        price={product.price}
        compareAtPrice={product.compare_at_price}
      />
    ),
    problem: <Problem text={content.problemText} />,
    benefits: <Benefits items={content.benefits} />,
    mediaGallery: <MediaGallery media={media} productName={product.name} />,
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
