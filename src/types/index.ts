export type UserRole = "owner" | "admin" | "agent" | "dispatch";

export type ProductStatus = "draft" | "live" | "archived";

export type LeadStatus =
  | "new"
  | "buying"
  | "delivery"
  | "paid"
  | "not_buying";

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
}
