-- Add show_on_homepage flag to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN products.show_on_homepage IS
  'When true and status=live, the product appears on the public homepage showcase.';
