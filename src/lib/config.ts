// Central branding configuration.
// Change the platform name via NEXT_PUBLIC_APP_NAME — no code edits needed.
// The order-number prefix lives in the `settings` table (order_prefix) and is
// applied by generate_order_number() in Postgres.

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Aridgets";
