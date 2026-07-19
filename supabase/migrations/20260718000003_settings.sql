CREATE TABLE IF NOT EXISTS public.settings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name    text NOT NULL DEFAULT 'Crift Shop',
  order_prefix     text NOT NULL DEFAULT 'CS',
  default_whatsapp text,
  default_theme    jsonb NOT NULL DEFAULT '{
    "primary":    "#e63946",
    "accent":     "#f1a208",
    "background": "#ffffff",
    "text":       "#1a1a1a",
    "font":       "Inter"
  }'::jsonb
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin'));

CREATE POLICY "admins_update_settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('owner', 'admin'))
  WITH CHECK (get_user_role() IN ('owner', 'admin'));

-- Exactly one settings row — always present
INSERT INTO public.settings (business_name, order_prefix)
VALUES ('Crift Shop', 'CS')
ON CONFLICT DO NOTHING;
