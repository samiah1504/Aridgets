CREATE TABLE IF NOT EXISTS public.ad_spend (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date        date NOT NULL,
  amount      integer NOT NULL CHECK (amount >= 0),   -- in Naira (whole units)
  platform    text NOT NULL CHECK (platform IN ('meta', 'tiktok')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, date, platform)
);

CREATE INDEX idx_ad_spend_product_date
  ON public.ad_spend (product_id, date DESC);

ALTER TABLE public.ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_ad_spend"
  ON public.ad_spend FOR ALL
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin'))
  WITH CHECK (get_user_role() IN ('owner', 'admin'));
