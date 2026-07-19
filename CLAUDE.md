@AGENTS.md

# Crift Shop — Conventions

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
- CAPI Purchase fires only when a lead transitions to `confirmed` — never on form submit. Guard against double-fire (`event_id_purchase` must be null).
- Lead pipeline: `new` → `confirmed` (responsibility ends here) | drop statuses: `not_buying`, `cancelled`, `not_picking_calls`. No fulfilment statuses — Crift Shop is lead-gen, not order fulfilment. `confirmed_at`/`dropped_at` timestamp the transitions.

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
