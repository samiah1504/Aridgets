CREATE TABLE IF NOT EXISTS public.product_media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('image', 'video')),
  url         text NOT NULL,
  provider    text CHECK (provider IN ('upload', 'youtube', 'vimeo', 'mp4')),
  slot        text NOT NULL CHECK (slot IN ('hero', 'gallery')),
  sort_order  integer NOT NULL DEFAULT 0,
  alt         text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_media_product_slot
  ON public.product_media (product_id, slot, sort_order);

ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

-- Public: read media for live products only
DROP POLICY IF EXISTS "public_read_product_media" ON public.product_media;
CREATE POLICY "public_read_product_media"
  ON public.product_media FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_media.product_id AND status = 'live'
    )
  );

-- Owner/admin: full CRUD on media for any product (including draft)
DROP POLICY IF EXISTS "admin_manage_product_media" ON public.product_media;
CREATE POLICY "admin_manage_product_media"
  ON public.product_media FOR ALL
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin'))
  WITH CHECK (get_user_role() IN ('owner', 'admin'));
