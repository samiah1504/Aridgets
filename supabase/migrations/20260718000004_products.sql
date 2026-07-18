CREATE TABLE IF NOT EXISTS public.products (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text UNIQUE NOT NULL,
  name                 text NOT NULL,
  status               text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'live', 'archived')),
  currency             text NOT NULL DEFAULT 'NGN',
  price                integer NOT NULL CHECK (price >= 0),
  compare_at_price     integer CHECK (compare_at_price >= 0),
  theme                jsonb NOT NULL DEFAULT '{
    "primary":    "#e63946",
    "accent":     "#f1a208",
    "background": "#ffffff",
    "text":       "#1a1a1a",
    "font":       "Inter"
  }'::jsonb,
  content              jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections             jsonb NOT NULL DEFAULT '[
    {"key":"announcementBar","enabled":true},
    {"key":"hero","enabled":true},
    {"key":"problem","enabled":true},
    {"key":"benefits","enabled":true},
    {"key":"mediaGallery","enabled":true},
    {"key":"howItWorks","enabled":true},
    {"key":"featuresSpecs","enabled":false},
    {"key":"socialProof","enabled":true},
    {"key":"urgency","enabled":true},
    {"key":"guarantee","enabled":true},
    {"key":"faq","enabled":true},
    {"key":"orderForm","enabled":true}
  ]'::jsonb,
  pixel_id             text,
  -- capi_access_token is secret: never SELECT it in client-role queries;
  -- only API routes using createServiceClient() (service-role) read it.
  capi_access_token    text,
  capi_test_event_code text,
  whatsapp_number      text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_slug   ON public.products (slug);
CREATE INDEX idx_products_status ON public.products (status);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public (anon): read live products for the sales page.
-- Application code MUST NOT select capi_access_token here.
CREATE POLICY "public_read_live_products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (status = 'live');

-- Owner/admin: full CRUD including draft/archived
CREATE POLICY "admin_manage_products"
  ON public.products FOR ALL
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin'))
  WITH CHECK (get_user_role() IN ('owner', 'admin'));
