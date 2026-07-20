# Aridgets — Production Readiness Report

_Audit date: 20 July 2026_

## ✅ Completed

### Build quality
- `next build` completes with zero errors and zero warnings.
- ESLint: 0 problems (was 15 — see fixes below).
- TypeScript strict check clean.
- No `console.log`, debug code, mock data, TODOs, or dead components in `src/`
  (`console.error` retained intentionally for server-side error reporting).
- Dead file `sections/OrderForm.tsx` was removed in an earlier pass; all
  dependencies in `package.json` are in use.

### Security
- All `/admin` routes require authentication at the middleware layer and
  authorization (`requirePerm`) per page; API routes verify permissions
  server-side.
- RLS enforces every rule at the database: lead visibility scoped by product
  assignment, publish/archive guarded by triggers, audit log restricted to
  Super Admin.
- **Fixed:** `capi_access_token` was serialized into the product editor page
  for any staff with `products.edit`. Now (a) the page only fetches the token
  via the service role for staff with `tracking.edit`, and (b) migration 23
  revokes the column from the `anon`/`authenticated` roles entirely, so even
  direct API calls cannot read it.
- Public lead API hardened: name/address/city length caps, state validated
  against the official list, quantity clamped 1–20, phone validated and
  normalised; Serious-Buyer confirmation enforced server-side.
- Auth callback protected against open redirects; pixel ID validated against
  a numeric pattern before script injection; React escapes all user content
  (XSS); Supabase client parameterizes all queries (SQL injection); state
  mutations require the Supabase auth cookie (CSRF surface limited to
  same-site requests).
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `VERCEL_TOKEN`,
  CAPI tokens) are server-only; nothing secret uses `NEXT_PUBLIC_*`.

### Performance
- Sales pages are server-rendered with parallel data fetching
  (`Promise.all` for media/options/variants); no heavy client bundles.
- List images lazy-load; hero images load eagerly (correct for LCP).
- Aggregations reuse single queries; tracking tables carry indexes
  (`product_id+created_at`, `lead_id`, `session_id`); leads indexed on
  product, status, phone, order number, assignee, created_at.

### SEO
- `metadataBase` + per-page titles/descriptions via the root layout template.
- Product pages: unique title/description, canonical URL, Open Graph +
  Twitter cards with the product hero image. (Previously all pages were
  `noindex` — now public pages are indexable.)
- `sitemap.xml` generated dynamically from live products.
- `robots.txt` allows `/`, disallows `/admin` and `/api`, references the
  sitemap. Admin section is additionally `noindex` via metadata.

### Error handling & UX
- Custom 404 page, custom error page with retry, admin loading state.
- Forms show friendly validation errors; API failures surface readable
  messages; network failures handled in every fetch path.
- Empty states exist for products, leads, staff, audit, tracking.

### Production configuration
- Canonical origin centralized as `SITE_URL` (env `NEXT_PUBLIC_SITE_URL`,
  default `https://aridgets.com`) — used by SEO metadata, sitemap, and CAPI
  source URLs. Brand name centralized as `APP_NAME`.
- Single-domain deployment verified: relative redirects and same-origin
  Supabase auth cookies work unchanged under `aridgets.com` +
  `aridgets.com/admin`.

### Database
- 23 sequential migrations, each idempotent (safe to re-run).
- RLS enabled on every table; policies rewritten around `has_perm()`.
- Old fulfilment columns removed in migration 17; `NIGERIAN_LGAS` constant
  removed with the City/Town change; `ad_spend` table retained (reserved for
  the analytics phase — unused but harmless).

## ⚠️ Issues found and fixed in this audit
1. CAPI token exposure to non-tracking staff (app + DB level) — fixed.
2. All pages were `noindex`, blocking SEO entirely — fixed.
3. No sitemap/robots/404/500 pages — added.
4. 15 ESLint errors/warnings (unescaped entities, nested component creation,
   sync setState in effects, unsafe `Function` type, unused imports) — fixed.
5. Lead API accepted unbounded input and any state string — hardened.
6. CAPI Purchase source URL defaulted to `aridgets.vercel.app` — now uses
   the canonical site URL.
7. Sitemap failed the production build (build-time DB access) — now dynamic.

## ❌ Remaining blockers before go-live (operator actions)
1. **Run pending SQL migrations** in Supabase (anything not yet applied,
   including migration 23 `products_column_privileges`).
2. **Vercel environment variables**: set `NEXT_PUBLIC_SITE_URL=https://aridgets.com`,
   `NEXT_PUBLIC_APP_NAME=Aridgets`, and confirm Supabase keys + VAPID keys
   are present in the Production environment.
3. **Attach the domain**: add `aridgets.com` to the Vercel project and point
   DNS at Vercel.
4. **Supabase Auth URLs**: set Site URL to `https://aridgets.com` and add
   `https://aridgets.com/auth/callback` to the redirect allow-list
   (Authentication → URL Configuration) so invite/reset emails land on the
   production domain.
5. **Meta**: verify `aridgets.com` in Meta Business Suite (Brand Safety →
   Domains) — not checkable via API.
6. **Backups**: Supabase Pro includes daily automated backups — confirm
   they're visible under Database → Backups, and optionally schedule a
   manual `pg_dump` before launch.
