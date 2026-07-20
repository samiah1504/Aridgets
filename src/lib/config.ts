// Central branding configuration.
// Change the platform name via NEXT_PUBLIC_APP_NAME — no code edits needed.
// The order-number prefix lives in the `settings` table (order_prefix) and is
// applied by generate_order_number() in Postgres.

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Aridgets";

// Serious Buyers notice defaults — per-product overrides live in
// products.content.seriousBuyer (editable in the product editor).
export const SERIOUS_BUYER_DEFAULTS = {
  heading: "Serious Buyers Only",
  message:
    "Please place an order only when you are fully ready to receive this product and have the money available to pay at the point of delivery. Stock is limited, so kindly do not submit an order unless you are genuinely ready to buy.",
  checkboxText:
    "I confirm that I am ready to receive and pay for this product on delivery.",
} as const;
