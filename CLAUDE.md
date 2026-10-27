@AGENTS.md

# Aridgets — Conventions

App name comes from `APP_NAME` in `src/lib/config.ts` (env: `NEXT_PUBLIC_APP_NAME`); order prefix from the `settings` table. Never hardcode the brand name.

Full build spec: `BUILD_BRIEF.md`

## Rules
- TypeScript throughout. No `any` unless unavoidable.
- Tailwind CSS only — no inline styles except setting CSS variables (`style={{ "--product-primary": theme.primary }}`).
- Secrets server-only: `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, `VAPID_PRIVATE_KEY`, per-product `capi_access_token`. Never use `NEXT_PUBLIC_*` for secrets.
- Mobile-first. All sales pages (`/p/[slug]`) must be fast and light — no heavy client bundles.
- `params` in pages/layouts is a `Promise` — always `await params` before destructuring.
- `headers()` and `cookies()` return Promises — always `await` them.
- Supabase: browser components use `src/lib/supabase/client.ts`; Server Components use `src/lib/supabase/server.ts`; API routes that bypass RLS use `createServiceClient()`.
- Currency: always NGN (₦). Use `formatNGN()` from `src/lib/utils/currency.ts`.
- Phone: validate with `isValidNGPhone()` and store normalised via `normaliseNGPhone()`.
- States: use `NIGERIAN_STATES` from `src/lib/constants/states.ts` — never hardcode.
- Order numbers: `{ORDER_PREFIX}-{6-digit zero-padded}`, prefix from `settings` table.
- CAPI Purchase fires only when an order becomes `paid` (its recorded payments cover the total) — never on form submit, confirm or deliver. Payments go through the `record_lead_payment()` DB function (row lock, idempotency key, `leads.mark_paid` permission); the event is sent by `deliverPurchaseEvent()` in `src/lib/purchaseEvent.ts` with the order's single `event_id_purchase`, reused on every retry. Delivery state lives in `leads.purchase_event_*`. Orders whose Purchase was sent at confirmation (before this rule) are marked `confirmed_legacy` and never re-sent.
- Lead pipeline: `new` → `confirmed` → `delivered` → `paid` | drop statuses: `not_buying`, `cancelled`, `not_picking_calls`. `confirmed_at`/`delivered_at`/`paid_at`/`dropped_at` timestamp the transitions. `paid` is reached only by recording payment (partial payments allowed; `amount_paid` vs `total`). Status labels/colours: `src/lib/leadStatus.ts`.
- RBAC: permissions live on `roles.permissions` (text[] of keys from `src/lib/permissions.ts`; `*` = all). RLS enforces via `has_perm()` in Postgres. Server pages guard with `requirePerm()` from `src/lib/auth.ts`; UI gates with `hasPerm()`. Customer-support visibility is scoped by `product_assignments`. Important actions log to `audit_log` via DB triggers.

## Build phases
0. Setup (done) — Next.js + Tailwind + Supabase client + helpers
1. Schema — Supabase migrations + RLS
2. Landing template — `/p/[slug]`
2A. Custom domains — middleware + Vercel Domains API
3. Tracking — Meta Pixel + CAPI
4. Auth + product editor
5. Pipeline + Purchase CAPI
5A. Admin PWA + Web Push
6. Dashboard + polish
