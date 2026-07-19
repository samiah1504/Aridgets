import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { ProductContent, ProductTheme, SectionConfig } from "@/types";
import MetaPixel from "@/components/MetaPixel";
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
import OrderForm from "@/components/sections/OrderForm";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, status, price, compare_at_price, theme, content, sections, pixel_id")
    .eq("slug", slug)
    .eq("status", "live")
    .single();
  return data;
}

async function getMedia(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");
  return data ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found" };
  const content = product.content as ProductContent;
  return {
    title: product.name,
    description: content.subhead ?? "",
    robots: { index: false, follow: false },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const product = await getProduct(slug);
  if (!product) notFound();

  const media = await getMedia(product.id);
  const theme = product.theme as ProductTheme;
  const content = product.content as ProductContent;
  const sections = (product.sections ?? []) as SectionConfig[];

  function sp1(key: string): string | undefined {
    const v = sp[key];
    return typeof v === "string" ? v : undefined;
  }

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
    urgency: (
      <Urgency text={content.urgencyText} hasCountdown={content.hasCountdown} />
    ),
    guarantee: <Guarantee text={content.guaranteeText} />,
    faq: <FAQ items={content.faq} />,
    orderForm: (
      <OrderForm
        productId={product.id}
        productName={product.name}
        price={product.price}
        title={content.orderFormTitle}
        successHeadline={content.orderSuccessHeadline}
        successBody={content.orderSuccessBody}
        ctaText={content.ctaText}
        pixelId={product.pixel_id ?? undefined}
        fbclid={sp1("fbclid")}
        utmSource={sp1("utm_source")}
        utmMedium={sp1("utm_medium")}
        utmCampaign={sp1("utm_campaign")}
        utmContent={sp1("utm_content")}
      />
    ),
  };

  return (
    <div
      style={{
        "--product-primary": theme.primary,
        "--product-accent": theme.accent,
        "--product-bg": theme.background,
        "--product-text": theme.text,
        "--product-font": theme.font,
        backgroundColor: theme.background,
        color: theme.text,
      } as React.CSSProperties}
      className="min-h-screen"
    >
      {sections
        .filter((s) => s.enabled)
        .map((s) =>
          sectionMap[s.key] ? (
            <div key={s.key}>{sectionMap[s.key]}</div>
          ) : null
        )}

      {content.footerText && (
        <footer className="text-center py-8 text-xs opacity-50 px-4">
          {content.footerText}
        </footer>
      )}

      {product.pixel_id && (
        <MetaPixel
          pixelId={product.pixel_id}
          productName={product.name}
          price={product.price}
        />
      )}
    </div>
  );
}
