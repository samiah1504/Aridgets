-- Product Options & Bundles template + delivery preference.
-- Purchasing options themselves live in products.content.purchaseOptions
-- (saved with the rest of the sales page). Orders keep a snapshot of what
-- was bought so later price/option edits never change historical orders.
-- Additive only: existing products, templates and leads are unaffected.

alter table public.products drop constraint if exists products_template_type_check;
alter table public.products
  add constraint products_template_type_check
  check (template_type in ('furniture', 'gadget', 'kids_toy', 'kids_fashion', 'options_bundles'));

-- Snapshot of the purchasing option chosen at order time:
-- { id, name, description, includes[], unit_price }.
-- unit_price / quantity / total stay in their existing columns.
alter table public.leads add column if not exists purchase_option_id text;
alter table public.leads add column if not exists purchase_option jsonb;

-- Customer's preferred delivery timing (a preference, not a commitment)
alter table public.leads add column if not exists delivery_preference text
  check (delivery_preference in ('asap', 'date'));
alter table public.leads add column if not exists delivery_date date;

alter table public.leads drop constraint if exists leads_delivery_date_check;
alter table public.leads add constraint leads_delivery_date_check
  check (delivery_preference is distinct from 'date' or delivery_date is not null);
