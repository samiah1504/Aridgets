CREATE TABLE IF NOT EXISTS public.domains (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname            text UNIQUE NOT NULL,
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind                text NOT NULL CHECK (kind IN ('custom', 'subdomain')),
  status              text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','verifying','live','error','disconnected')),
  ssl_status          text,
  vercel_verification jsonb,        -- TXT/CNAME records returned by Vercel for operator to set
  is_primary          boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domains_hostname   ON public.domains (hostname);
CREATE INDEX IF NOT EXISTS idx_domains_product_id ON public.domains (product_id);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Middleware reads domains to resolve incoming hostnames to products.
-- The middleware uses the service-role client, so RLS is bypassed there.
-- We also allow anon SELECT so the edge middleware can use the anon key if preferred.
DROP POLICY IF EXISTS "public_read_domains" ON public.domains;
CREATE POLICY "public_read_domains"
  ON public.domains FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only owner/admin can add, edit, or remove domain records
DROP POLICY IF EXISTS "admin_manage_domains" ON public.domains;
CREATE POLICY "admin_manage_domains"
  ON public.domains FOR ALL
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin'))
  WITH CHECK (get_user_role() IN ('owner', 'admin'));
