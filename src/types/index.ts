export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  created_at: string;
}

export type TemplateType = "furniture" | "gadget" | "kids_toy" | "kids_fashion";
export type OptionDisplayType = "buttons" | "colour_swatch" | "dropdown";

export type ProductStatus = "draft" | "live" | "archived";

export type LeadStatus =
  | "new"
  | "confirmed"
  | "not_buying"
  | "cancelled"
  | "not_picking_calls";

export type DomainStatus =
  | "pending"
  | "verifying"
  | "live"
  | "error"
  | "disconnected";

export type MediaKind = "image" | "video";
export type MediaProvider = "upload" | "youtube" | "vimeo" | "mp4";
export type MediaSlot = "hero" | "gallery";

export interface ProductTheme {
  primary: string;
  accent: string;
  background: string;
  text: string;
  font: string;
}

export interface SectionConfig {
  key: string;
  enabled: boolean;
}

// All editable copy for a product's landing page.
export interface ProductContent {
  announcementBar?: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  starRating?: number;
  ctaText?: string;
  trustRow?: string[];
  problemText?: string;
  benefits?: Array<{ icon?: string; text: string }>;
  howItWorksSteps?: Array<{ title: string; description: string }>;
  featuresSpecs?: string[];
  testimonials?: Array<{
    name: string;
    location: string;
    rating: number;
    text: string;
    photo?: string;
  }>;
  urgencyText?: string;
  hasCountdown?: boolean;
  countdownEndsAt?: string;
  guaranteeText?: string;
  faq?: Array<{ question: string; answer: string }>;
  footerText?: string;
  orderFormTitle?: string;
  orderSuccessHeadline?: string;
  orderSuccessBody?: string;
  // Extended fields used by non-gadget themes
  ageRange?: string;
  material?: string;
  deliveryInfo?: string;
  dimensions?: string;
  videoUrl?: string;
}

// ── Variations ────────────────────────────────────────────────────────────────

export interface ProductOptionValue {
  id: string;
  product_option_id: string;
  value: string;
  colour_hex: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  display_type: OptionDisplayType;
  required: boolean;
  sort_order: number;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  price_override: number | null;
  compare_at_price_override: number | null;
  stock_quantity: number | null;
  active: boolean;
  image_url: string | null;
  sort_order: number;
  option_value_ids: string[];
}
