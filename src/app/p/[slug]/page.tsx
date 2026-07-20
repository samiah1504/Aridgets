import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/config";
import type { ProductContent, ProductTheme, SectionConfig, ProductOption, ProductVariant, TemplateType, OptionDisplayType } from "@/types";
import MetaPixel from "@/components/MetaPixel";
import GadgetTheme from "@/components/themes/GadgetTheme";
import FurnitureTheme from "@/components/themes/FurnitureTheme";
import KidsToyTheme from "@/components/themes/KidsToyTheme";
import KidsFashionTheme from "@/components/themes/KidsFashionTheme";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, slug, status, price, compare_at_price, theme, content, sections, pixel_id, template_type"
    )
    .eq("slug", slug)
    .eq("status", "live")
    .single();
  return data;
}

async function getMedia(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_media")
    .select("id, kind, url, provider, slot, sort_order, alt")
    .eq("product_id", productId)
    .order("sort_order");
  return data ?? [];
}

async function getOptions(productId: string): Promise<ProductOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_options")
    .select("id, product_id, name, display_type, required, sort_order, product_option_values(id, product_option_id, value, colour_hex, image_url, sort_order, active)")
    .eq("product_id", productId)
    .order("sort_order");

  if (!data) return [];
  return data.map((o) => ({
    id: o.id,
    product_id: o.product_id,
    name: o.name,
    display_type: o.display_type as OptionDisplayType,
    required: o.required,
    sort_order: o.sort_order,
    values: ((o.product_option_values ?? []) as Array<{
      id: string; product_option_id: string; value: string;
      colour_hex: string | null; image_url: string | null;
      sort_order: number; active: boolean;
    }>).sort((a, b) => a.sort_order - b.sort_order),
  }));
}

async function getVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_variants")
    .select(
      "id, product_id, sku, price_override, compare_at_price_override, stock_quantity, active, image_url, sort_order, product_variant_options(option_value_id)"
    )
    .eq("product_id", productId)
    .order("sort_order");

  if (!data) return [];
  return data.map((v) => ({
    id: v.id,
    product_id: v.product_id,
    sku: v.sku,
    price_override: v.price_override,
    compare_at_price_override: v.compare_at_price_override,
    stock_quantity: v.stock_quantity,
    active: v.active,
    image_url: v.image_url,
    sort_order: v.sort_order,
    option_value_ids: (
      (v.product_variant_options ?? []) as Array<{ option_value_id: string }>
    ).map((pvo) => pvo.option_value_id),
  }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found", robots: { index: false } };

  const content = product.content as ProductContent;
  const media = await getMedia(product.id);
  const images = media.filter((m) => m.kind === "image");
  const heroImage = images.find((m) => m.slot === "hero")?.url ?? images[0]?.url;

  const description =
    content.subhead ??
    content.headline ??
    `Order ${product.name} — pay on delivery, nationwide across Nigeria.`;
  const url = `${SITE_URL}/p/${product.slug}`;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      url,
      type: "website",
      ...(heroImage && { images: [{ url: heroImage, alt: product.name }] }),
    },
    twitter: {
      card: heroImage ? "summary_large_image" : "summary",
      title: product.name,
      description,
      ...(heroImage && { images: [heroImage] }),
    },
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

  const [media, options, variants] = await Promise.all([
    getMedia(product.id),
    getOptions(product.id),
    getVariants(product.id),
  ]);

  const theme = product.theme as ProductTheme;
  const content = product.content as ProductContent;
  const sections = (product.sections ?? []) as SectionConfig[];
  const templateType = (product.template_type ?? "gadget") as TemplateType;

  function sp1(key: string): string | undefined {
    const v = sp[key];
    return typeof v === "string" ? v : undefined;
  }

  const tracking = {
    pixelId: product.pixel_id ?? undefined,
    fbclid: sp1("fbclid"),
    utmSource: sp1("utm_source"),
    utmMedium: sp1("utm_medium"),
    utmCampaign: sp1("utm_campaign"),
    utmContent: sp1("utm_content"),
  };

  const themeProps = {
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      compare_at_price: product.compare_at_price,
      pixel_id: product.pixel_id,
    },
    content,
    theme,
    sections,
    media,
    options,
    variants,
    tracking,
  };

  const ThemeComponent =
    templateType === "furniture" ? FurnitureTheme
    : templateType === "kids_toy" ? KidsToyTheme
    : templateType === "kids_fashion" ? KidsFashionTheme
    : GadgetTheme;

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
      <ThemeComponent {...themeProps} />

      {product.pixel_id && (
        <MetaPixel
          pixelId={product.pixel_id}
          productId={product.id}
          productName={product.name}
          price={product.price}
        />
      )}
    </div>
  );
}
