# DropDesk — Build Brief

> **Working name:** `DropDesk` (placeholder). Swap it everywhere before shipping — it appears in the app title, order-number prefix (`DD-`), and metadata. Pick the final name and do a find-and-replace.

A self-hosted, single-operator **COD (cash/pay-on-delivery) sales-page engine** for Nigeria. It replaces GoHighLevel for one narrow job: spin up a high-converting landing page per product, capture leads from Facebook/TikTok ads, and work those leads through a call → deliver → collect-cash pipeline. Built for a **rotating "hot product" model** — no brand, no catalog. A product sells, we archive it, we launch the next.

This is a **separate business** from Kanziy and Toystore. Fresh app, fresh database, fresh deployment.

---

## 1. Core principles (read first — they shape every decision)

1. **One template, product = config.** There is exactly ONE landing-page template. Every product page is that template rendered from a database record (copy, media, colours, price, pixel). Launching a product must take minutes, not a design session. **Do not build a drag-and-drop page builder.**
2. **The landing page is a long-form direct-response sales page**, not a product card. Hero, proof, benefits, media, urgency, FAQ, guarantee, order form. All sections editable and toggleable per product.
3. **COD reality drives the tracking.** A form submit is a **Lead**, not a sale. The real **Purchase** happens days later when the rider collects cash. So we capture Facebook match identifiers at form time and fire the **Purchase via the Conversions API only when a lead is marked Paid.** This is the single most important behaviour in the whole system — it teaches the ad platform to find people who actually pay on delivery, not people who just fill forms.
4. **Mobile-first, fast.** Nigerian ad traffic is almost entirely mobile on variable connections. Every page must be light and load fast.
5. **Owner-editable.** The operator adjusts colours, swaps images/video, and rewrites copy from the admin — never by touching code.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router, TypeScript)** | Dynamic per-product routes (`/p/[slug]`), server API routes for CAPI, image optimisation, good SEO |
| Styling | **Tailwind CSS** | Fast, themeable via CSS variables |
| Database + Auth | **Supabase** (Postgres, Auth, Storage, RLS) | Operator already uses it; RLS keeps CAPI tokens server-only |
| Media storage | **Supabase Storage** (images) + support pasted video URLs (YouTube/Vimeo/direct MP4) | Uploads for images; embeds keep the page light |
| Deploy | **Vercel** (required) | One project serves unlimited custom domains with automatic per-domain SSL via the Vercel Domains API + Next.js middleware. This is the core of the "each sales page on its own domain" requirement (see §4A). Do not use Netlify — it does not automate per-tenant custom domains the same way. |
| Tracking | **Meta Pixel (client)** + **Meta Conversions API (server)** | Client + server for match quality; server for delayed Purchase |

**Non-negotiables**
- TypeScript throughout.
- All secrets (CAPI access tokens) live server-side only — never shipped to the browser, never in a client component, never in `NEXT_PUBLIC_*`.
- Nigerian phone validation and `₦` (NGN) formatting as first-class helpers.
- Currency default **NGN**.

---

## 3. Data model (Supabase / Postgres)

Use SQL migrations. Enable RLS on every table. Below is the intended shape — adjust types sensibly.

### `products`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | used in `/p/[slug]` |
| name | text | internal + default headline |
| status | text | `draft` \| `live` \| `archived` |
| currency | text | default `NGN` |
| price | integer | in Naira (whole units) |
| compare_at_price | integer null | strikethrough "was" price |
| theme | jsonb | `{ primary, accent, background, text, font }` (colours as hex) |
| content | jsonb | all section copy (see §4) |
| sections | jsonb | ordered array of `{ key, enabled }` controlling which sections show and in what order |
| pixel_id | text null | Meta Pixel ID for this product's page |
| capi_access_token | text null | **secret** — server-only, never selectable by client role |
| capi_test_event_code | text null | optional, for Events Manager testing |
| whatsapp_number | text null | optional click-to-chat fallback |
| created_at / updated_at | timestamptz | |

### `product_media`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| product_id | uuid fk | |
| kind | text | `image` \| `video` |
| url | text | Supabase Storage URL or external video URL |
| provider | text null | `upload` \| `youtube` \| `vimeo` \| `mp4` |
| slot | text | `hero` \| `gallery` |
| sort_order | int | |
| alt | text null | |

### `leads`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| order_number | text unique | e.g. `DD-000123` (prefix from settings, zero-padded sequence) |
| product_id | uuid fk | |
| name | text | |
| phone | text | validated NG number |
| email | text null | optional |
| address | text | |
| state | text | one of the 36 states + FCT |
| lga | text null | optional |
| quantity | int | default 1 |
| unit_price | integer | snapshot at order time |
| total | integer | unit_price × quantity |
| status | text | `new` \| `buying` \| `delivery` \| `paid` \| `not_buying` |
| assigned_to | uuid null fk profiles | |
| call_notes | text null | |
| **tracking** | | |
| fbp | text null | `_fbp` cookie |
| fbc | text null | `_fbc` cookie (derived from `fbclid` if cookie absent) |
| fbclid | text null | from URL |
| event_id_lead | text | uuid used to dedup client+server Lead |
| event_id_purchase | text null | generated when Purchase fires |
| client_user_agent | text null | for CAPI |
| client_ip | text null | for CAPI |
| utm_source / utm_medium / utm_campaign / utm_content | text null | |
| **timestamps** | | |
| created_at | timestamptz | |
| confirmed_at / dispatched_at / paid_at | timestamptz null | set on status transitions |

### `domains` (custom domain per sales page — see §4A)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| hostname | text unique | e.g. `www.craftstore.com` (and store the apex `craftstore.com` too, or handle www/apex in middleware) |
| product_id | uuid fk | which sales page this domain serves |
| kind | text | `custom` (bought domain) \| `subdomain` (free `slug.rootdomain.com`) |
| status | text | `pending` \| `verifying` \| `live` \| `error` \| `disconnected` |
| ssl_status | text | mirror of Vercel cert status |
| vercel_verification | jsonb null | TXT/CNAME records Vercel returns for the operator to set |
| is_primary | bool | if a product has multiple domains, which is canonical |
| created_at | timestamptz | |

### `lead_status_history`
`id, lead_id fk, from_status, to_status, changed_by fk, note, created_at` — full audit trail.

### `profiles` (extends Supabase `auth.users`)
`id (=auth uid), full_name, role, active` — role ∈ `owner` \| `admin` \| `agent` \| `dispatch`.

### `ad_spend` (for cost-per-confirmed-order)
`id, product_id fk, date, amount, platform (meta|tiktok)` — operator enters daily spend; the dashboard divides spend by confirmed orders.

### `settings`
Single-row config: `business_name, order_prefix, default_whatsapp, default_theme jsonb`.

---

## 4. The landing page — full sales-page spec

Route: **`/p/[slug]`** (public, server-rendered, SEO + Open Graph tags from product). Renders the ONE template from the product record. Sections render in the order defined by `products.sections`, and each can be toggled off. All copy comes from `products.content` (jsonb) so it's fully editable in admin.

**Theme:** the template reads `products.theme` and sets CSS variables (`--primary`, `--accent`, `--bg`, `--text`, `--font`). Every coloured element uses those variables so the operator can recolour the whole page from the admin.

### Section list (in default order)
1. **Announcement bar** (sticky, top) — short line, e.g. "Pay on Delivery · Free nationwide shipping". Editable text + on/off.
2. **Hero** — eyebrow, big benefit headline, subhead, **hero media** (image *or* video), star-rating row, price block (current price, strikethrough compare-at, % saved badge), primary CTA ("Order Now — Pay on Delivery" → scrolls to order form), trust row (Secure · Pay on Delivery · Nationwide).
3. **Problem / agitation** — short block naming the pain the product solves.
4. **Benefits** — icon + text list (editable items).
5. **Media gallery** — multiple images and/or an embedded video (YouTube/Vimeo/MP4). Lazy-loaded.
6. **How it works** — 3 simple steps (Order → We call to confirm → Pay the rider on delivery). This doubles as COD reassurance.
7. **Features / specs** — bullet or spec table.
8. **Social proof** — testimonials (name, location, star rating, optional photo), "customers across Nigeria" style trust. Editable list.
9. **Urgency** — limited-stock line and/or optional countdown timer. Both toggleable (operator may leave off).
10. **Guarantee** — return/refund/quality reassurance box.
11. **FAQ** — accordion, editable Q&A list (include COD-specific questions: "When do I pay?", "What if I don't like it?").
12. **Order form + final CTA** — the conversion block (see below).
13. **Footer** — business name, minimal.

**Sticky mobile order button:** a persistent bottom bar on mobile ("Order Now — {price}") that scrolls to the order form.

### The order form (the money block)
Fields: **Full name**, **Phone** (required, NG-validated), **Delivery address**, **State** (dropdown, 36 states + FCT), **LGA** (optional), **Quantity** (1–n). Optional **email**.

- Big reassurance under the button: "No payment online. Pay cash to the rider on delivery."
- Live total = `price × quantity`.
- On submit: create lead → fire tracking (see §5) → show a clean success state ("Order received, we'll call {firstname} shortly to confirm. Pay {total} on delivery.").
- Never use an HTML `<form>` that reloads; handle via `onClick` + fetch to the API.

**Nigerian states list** (hardcode this constant):
Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT (Abuja), Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara.

---

## 4A. Custom domains — each sales page on its own domain

**Requirement:** every sales page can live on its own real, separate domain (`www.craftstore.com` → one product page, `www.anotheroffer.com` → another). Unlimited pages, unlimited domains, all served from this one app. This is not cosmetic — putting each offer on a separate root domain **isolates ad-account risk**: if Meta flags one domain, it doesn't cascade to the others, and recovery is just "disconnect the flagged domain, connect a fresh one to the same page" (page + leads + data stay put).

### How it works (Vercel multi-tenant pattern)
1. **Hostname routing.** Next.js **middleware** reads the incoming `Host` header on every request, looks it up in the `domains` table, and renders that product's sales page. (Same "one template, config decides what shows" idea — now the *domain* also decides.) The main app/admin lives on the root app domain; everything else resolves by hostname.
2. **Connecting a domain (from admin):**
   - Operator enters a domain they own (e.g. `craftstore.com`).
   - App calls the **Vercel Domains API** (`@vercel/sdk`, `projectsAddProjectDomain`) to attach it to the project.
   - App shows the operator the DNS records Vercel returns (CNAME → `cname.vercel-dns.com` for `www`, or A record for apex, or a TXT record if the domain needs ownership verification).
   - Operator sets those records at their registrar. App polls Vercel for verification + SSL status and flips the `domains` row to `live` when ready.
   - **Vercel auto-issues and auto-renews the SSL certificate** for each domain — no manual cert work.
3. **Free instant subdomains (the fast default).** Add a wildcard domain (`*.yourrootdomain.com`) to the Vercel project once (via Vercel nameservers). Then any new product can get an instant, free, SSL'd `slug.yourrootdomain.com` with zero setup — perfect for quickly testing a product before committing to a bought domain.

### Practical rules to encode
- **Default = instant subdomain; upgrade winners to a bought domain.** New products auto-get a `slug.yourrootdomain.com`. The "Connect custom domain" step is optional, for offers worth branding/isolating.
- **DNS propagation is 24–48h** — surface this in the admin ("allow up to 48 hours") so the operator connects domains *ahead* of launch, not same-day.
- **Isolation caveat (state this in the UI):** subdomains share the root domain's reputation; only *separate bought domains* give true ban isolation. If the goal is ad-safety, use separate domains.
- **www + apex:** handle both — redirect apex → www (or vice versa) and set a canonical URL so Meta/SEO see one primary domain per page.
- **Vercel API rate limits** are generous for this scale (≈100 domain-adds/hour) — no concern.
- **Disconnect flow:** removing a domain calls the Vercel SDK to detach it and sets the row to `disconnected`; the product page stays live on its other domains/subdomain.

### Env / config this needs
`VERCEL_TOKEN` (server-only), `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, and `ROOT_DOMAIN` (your app + wildcard subdomain root). All server-side.

> Reference architecture: Vercel "Platforms Starter Kit" / multi-tenant docs — the hostname-middleware + Domains-API pattern. Point Claude Code at that pattern when building this section.

---

## 5. Meta Pixel + Conversions API — the critical spec

Each product page uses **its own `pixel_id`** and **its own `capi_access_token`** (stored on the product record; token server-only). Build a tracking module that does both client and server events with deduplication.

### Client-side (Meta Pixel, in the browser)
- Load the Pixel with the product's `pixel_id`.
- On page load: fire **PageView** and **ViewContent** (`content_ids=[slug]`, `value=price`, `currency=NGN`).
- On order submit: generate an **`event_id` (uuid)** and fire the **Lead** event client-side with that `event_id`, `value`, `currency`.
- **Capture identifiers at submit and send them to the server with the lead:** `_fbp` cookie, `_fbc` cookie (if absent, construct from `fbclid` URL param), `fbclid`, the page `userAgent`, and let the API read the request IP. Also capture UTM params.

### Server-side (Conversions API, from Next.js API routes)
- **`POST /api/lead`** — creates the lead in Supabase, then sends a **Lead** event to CAPI using the **same `event_id`** as the client Lead (so Meta deduplicates the pair). Include hashed customer data (SHA-256 of normalised phone; email if given), `fbp`, `fbc`, `client_ip`, `client_user_agent`, `action_source: "website"`, event source URL.
- **`POST /api/purchase`** (called from the admin when a lead is marked **Paid**) — sends a **Purchase** event to CAPI:
  - `value = lead.total`, `currency = NGN`
  - identifiers from the stored lead: `fbp`, `fbc`, hashed phone, `client_ip`, `client_user_agent`
  - fresh `event_id` (store as `event_id_purchase`), `event_time` = the actual paid time
  - `action_source: "physical_store"` (cash collected on delivery is an offline conversion) — or `"website"` if that matches Events Manager setup better; make it configurable.
  - Guard against double-firing: only fire once per lead (check `event_id_purchase` is null first).

### Why this matters (put a comment in the code)
Optimising for **Lead** gives cheap, low-quality form-fills — many never pay. Feeding the real **Purchase** (cash collected) back via CAPI lets Meta optimise toward people who actually pay on delivery. Support an optional **Purchase** at Paid as the primary optimisation signal once a pixel has enough volume; until then the operator optimises for Lead. Make both events reliable.

Include a **test mode** using `capi_test_event_code` so events can be verified in Events Manager before going live.

---

## 6. Admin / Ops Console spec

Authenticated area (Supabase Auth). Mobile-friendly — the operator and agents work from phones.

### 6a. Product editor (owner/admin only)
Everything a product needs, no code:
- **Basics:** name, slug (auto from name, editable), status (draft/live/archived), price, compare-at price, WhatsApp number.
- **Theme:** colour pickers for primary, accent, background, text; a font selector (3–5 presets). Live preview.
- **Media:** upload images to Supabase Storage (hero + gallery), reorder by drag, set alt text; add video by **upload OR paste URL** (YouTube/Vimeo/MP4), assign to hero or gallery.
- **Copy:** edit every section's text (headline, subhead, benefits list, testimonials, FAQ items, guarantee, announcement bar, how-it-works steps, urgency text).
- **Sections:** toggle each section on/off and reorder them.
- **Tracking:** set `pixel_id`, `capi_access_token`, optional `test_event_code`.
- **Preview + copy link:** open the live `/p/[slug]` and copy the URL for ads.
- **Domains (see §4A):** each product gets a free `slug.rootdomain.com` automatically. A **"Connect custom domain"** panel lets the operator enter a bought domain, then shows the exact DNS records to set and a live status (`pending → verifying → live`). Once live, the ad link uses the custom domain. A **disconnect** button detaches it (page stays live on its other domains).

### 6b. Leads pipeline (owner/admin/agent)
- List/board of leads with status pills. Filter by status, product, state, assigned agent. Search by name/phone/order number.
- Each lead: customer details, product, total, tracking badge (show "fbp ✓" when identifiers are stored so the agent trusts the Purchase will match), call notes field, assigned agent.
- **Status actions with the right transitions:**
  - `new` → **Buying** (confirmed on call) → sets `confirmed_at`
  - `new`/`buying` → **Not Buying** (declined) 
  - `buying` → **Out for Delivery** → sets `dispatched_at`
  - `delivery` → **Paid** → sets `paid_at` **and fires `/api/purchase`**
  - `delivery` → **Returned/Not Buying** (rejected on delivery)
  - `not_buying` → **Re-open** (back to new)
- Every transition writes to `lead_status_history`.
- Optional: **WhatsApp the customer** — a button that opens click-to-chat with a pre-filled confirmation message.

### 6c. Dashboard (owner/admin)
- Today / this-week counts: leads, confirmed, delivered, paid, lost.
- **Conversion funnel:** lead → confirmed rate → delivered rate → paid rate.
- **Cost per confirmed order** = `ad_spend ÷ confirmed orders` (operator enters spend in the `ad_spend` table; break down per product and per platform).
- Revenue collected (sum of paid totals). Breakdown by product and by state (states matter for delivery/return patterns).

### 6d. Roles & security (RLS)
- `owner`/`admin`: full access, including product secrets.
- `agent`: read + update leads only; **cannot** read `capi_access_token` or edit products.
- `dispatch` (optional): sees confirmed/out-for-delivery leads, can mark delivered/paid.
- RLS policies enforce the above. **`capi_access_token` must never be selectable by the client anon/authenticated role** — only service-role API routes read it.

### 6e. PWA + push notifications (admin only)
The **public sales pages stay plain fast websites** (no service worker, no install — they must load instantly from an ad tap). The **`/admin` area is a PWA** so the operator and agents install it like an app and get lead alerts.

- **Installable:** web app manifest (name, icon, theme colour, `display: standalone`, `start_url: /admin`) so it adds to the home screen on Android/iOS.
- **Service worker scoped to `/admin` only** — do not register it on `/p/*` sales pages. Cache the admin shell for fast reopen and basic offline tolerance; never cache lead data staleley (always fetch fresh on open).
- **Web Push — new-lead alerts (the important part):** when `POST /api/lead` creates a lead, fire a Web Push notification to subscribed admin/agent devices: e.g. *"New lead · Amaka O. · Lagos · Posture Pro"*, tapping it deep-links straight to that lead in the pipeline. In COD, speed-to-call is the whole game — this closes the gap between form submit and the confirmation call while intent is hot.
  - Use the standard Web Push (VAPID) flow: on first admin login, ask permission and store the `PushSubscription` in a `push_subscriptions` table (`id, user_id fk, subscription jsonb, created_at`).
  - Server sends pushes via VAPID keys (env, server-only). Handle expired/failed subscriptions (prune on 410/404).
  - iOS caveat: web push works only when the PWA is **installed to the home screen** (not in-browser Safari) — surface a one-time "Add to Home Screen to get lead alerts" prompt for iOS users.
- **Optional nicety:** per-user notification toggle and quiet-hours in settings, so off-shift agents aren't pinged.

---

## 7. Order numbers, WhatsApp, misc behaviours
- **Order number:** `{prefix}-{6-digit zero-padded sequence}`, e.g. `DD-000123`. Prefix from `settings`.
- **WhatsApp (optional):** landing page can show a "Order on WhatsApp" fallback button that opens a pre-filled message to `whatsapp_number`; agents can WhatsApp customers from the pipeline.
- **SEO/OG:** each `/p/[slug]` sets title, description, and Open Graph image (hero image) so ad link previews look right.

---

## 8. Build order (phases — ship each before the next)

**Phase 0 — Setup**
Next.js (App Router, TS) + Tailwind + Supabase client. Env wiring. **Deploy to Vercel.** Base layout, NGN + phone helpers, states constant.

**Phase 1 — Schema**
All migrations from §3. RLS enabled. Seed 1–2 demo products so the template has something to render.

**Phase 2 — Landing template**
`/p/[slug]` rendering ALL sections from `content`/`sections`/`theme`/`product_media`. Theme via CSS variables. Order form → `POST /api/lead` creates a lead + order number. Success state. Sticky mobile CTA. Mobile-first, fast.

**Phase 2A — Custom domains (§4A)**
Hostname middleware resolving `Host` → product via the `domains` table. Wildcard subdomain (`*.rootdomain.com`) for instant free pages. Vercel Domains API integration to add/verify/remove custom domains, with the admin "Connect custom domain" flow + DNS instructions + status polling. Auto-SSL confirmed working on a test custom domain.

**Phase 3 — Tracking**
Meta Pixel client (PageView, ViewContent, Lead + `event_id`), capture `fbp`/`fbc`/`fbclid`/UTM/UA. Server CAPI **Lead** (dedup). Test-mode wiring.

**Phase 4 — Auth + product editor**
Supabase Auth, `profiles`/roles. Full product editor: basics, theme colour pickers, media upload + video URL, per-section copy editing, section toggle/reorder, tracking config, live preview.

**Phase 5 — Pipeline + Purchase**
Leads list/board, filters, status transitions with history, call notes, assignment. **Mark Paid fires `/api/purchase` (CAPI Purchase).** Double-fire guard. Optional WhatsApp.

**Phase 5A — Admin PWA + lead push (§6e)**
Web app manifest + service worker scoped to `/admin` (never on `/p/*`). Web Push (VAPID): permission prompt + `push_subscriptions` table; `POST /api/lead` sends a "New lead" push that deep-links to the lead. iOS "Add to Home Screen" prompt. Per-user notification toggle.

**Phase 6 — Dashboard + polish**
Funnel + cost-per-confirmed-order + revenue + breakdowns. `ad_spend` entry. RLS hardening, SEO/OG, performance pass, accessibility (keyboard focus, reduced motion), error/empty states.

---

## 9. Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only — used by API routes for CAPI + secrets
META_GRAPH_API_VERSION=           # e.g. v21.0
NEXT_PUBLIC_APP_NAME=DropDesk
ORDER_PREFIX=DD
# Custom domains (§4A) — all server-only:
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
ROOT_DOMAIN=                      # app + wildcard subdomain root, e.g. dropdesk.com
# Admin PWA web push (§6e):
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=                    # mailto: contact for push service
```
Per-product `pixel_id` and `capi_access_token` live in the DB, not env (products rotate and may use different pixels).

---

## 10. Definition of done
- Operator can create a product, recolour it, add images + a video, edit every line of copy, toggle sections, set a pixel — and get a live, fast, mobile sales page, all without touching code.
- Each sales page is reachable on a free `slug.rootdomain.com` instantly, and the operator can connect an owned custom domain (e.g. `www.craftstore.com`) that serves that page with auto-SSL. Unlimited pages, unlimited domains, one app.
- A form submit creates a lead, fires client Pixel Lead + server CAPI Lead (deduped), and stores `fbp`/`fbc` on the lead.
- Working the lead to **Paid** fires a CAPI **Purchase** with the correct value, matched via the stored identifiers, exactly once.
- Agents (limited role) can work leads but can't see CAPI tokens or edit products.
- The `/admin` area installs as a PWA and sends a push notification the moment a new lead comes in, deep-linking to that lead. Public sales pages remain plain fast websites (no service worker).
- Dashboard shows cost per confirmed order.

---

### How to use this file with Claude Code
Drop this in the repo root as `BUILD_BRIEF.md`. Point Claude Code at it and build **phase by phase** — tell it to complete and let you test each phase before moving on, rather than generating everything at once. Keep a short `CLAUDE.md` noting conventions (TypeScript, Tailwind, secrets server-only, mobile-first) so they persist across sessions.
