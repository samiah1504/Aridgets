export interface SeriousBuyerNotice {
  enabled?: boolean; // default true
  heading?: string;
  message?: string;
  checkboxText?: string;
  required?: boolean; // default true
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  created_at: string;
}

export type TemplateType =
  | "furniture"
  | "gadget"
  | "kids_toy"
  | "kids_fashion"
  | "options_bundles";

// ── Purchasing options (Product Options & Bundles template) ─────────────────
// Stored in products.content.purchaseOptions; array order = display order.

export interface PurchaseOption {
  id: string;
  name: string;
  description?: string;
  price: number; // whole naira, per unit
  imageUrl?: string;
  includes?: string[];
  active: boolean;
  /** @deprecated Retired per-option limits: ignored when ordering, removed on next save */
  minQty?: number;
  /** @deprecated Retired per-option limits: ignored when ordering, removed on next save */
  maxQty?: number;
}

// What the customer bought, frozen onto the lead at order time
export interface PurchaseOptionSnapshot {
  id: string;
  name: string;
  description: string | null;
  includes: string[];
  unit_price: number;
}

export type DeliveryPreference = "asap" | "date";

export interface DeliveryPreferenceSettings {
  enabled?: boolean; // default: on for options_bundles, off for other templates
  label?: string;
  asapLabel?: string;
  dateLabel?: string;
}
export type OptionDisplayType = "buttons" | "colour_swatch" | "dropdown";

export type ProductStatus = "draft" | "live" | "archived";

export type LeadStatus =
  | "new"
  | "confirmed"
  | "delivered"
  | "paid"
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

export type ButtonShape = "square" | "rounded" | "pill";
export type CardStyle = "border" | "shadow";
export type SectionSpacing = "compact" | "comfortable" | "spacious";

export interface ProductTheme {
  primary: string;
  accent: string;
  background: string;
  text: string;
  font: string;
  // Optional (older pages don't have them; see resolveTheme for defaults)
  preset?: string; // preset last applied; colours may since have been customised
  buttonShape?: ButtonShape;
  cardStyle?: CardStyle;
  spacing?: SectionSpacing;
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
  seriousBuyer?: SeriousBuyerNotice;
  recentOrdersEnabled?: boolean; // default true — social-proof popup on the sales page
  productDescription?: string;
  purchaseOptions?: PurchaseOption[];
  purchaseOptionsHeading?: string;
  deliveryPreference?: DeliveryPreferenceSettings;
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
