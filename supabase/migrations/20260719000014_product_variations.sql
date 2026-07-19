-- Product options (e.g. "Colour", "Size", "Age")
create table if not exists product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  display_type text not null default 'buttons'
    constraint product_options_display_type_check
      check (display_type in ('buttons', 'colour_swatch', 'dropdown')),
  required boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_options_product_id_idx on product_options(product_id);

-- Option values (e.g. "Red", "XL", "4–5 Years")
create table if not exists product_option_values (
  id uuid primary key default gen_random_uuid(),
  product_option_id uuid not null references product_options(id) on delete cascade,
  value text not null,
  colour_hex text,
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true
);

create index if not exists product_option_values_option_id_idx on product_option_values(product_option_id);

-- Variants (each unique combination of option values)
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text,
  price_override numeric(12,0),
  compare_at_price_override numeric(12,0),
  stock_quantity int,
  active boolean not null default true,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on product_variants(product_id);

-- Variant ↔ option-value links
create table if not exists product_variant_options (
  variant_id uuid not null references product_variants(id) on delete cascade,
  option_value_id uuid not null references product_option_values(id) on delete cascade,
  primary key (variant_id, option_value_id)
);

-- RLS
alter table product_options enable row level security;
alter table product_option_values enable row level security;
alter table product_variants enable row level security;
alter table product_variant_options enable row level security;

-- Authenticated users (admin) — full access
create policy "product_options_auth_all" on product_options
  for all to authenticated using (true) with check (true);
create policy "product_option_values_auth_all" on product_option_values
  for all to authenticated using (true) with check (true);
create policy "product_variants_auth_all" on product_variants
  for all to authenticated using (true) with check (true);
create policy "product_variant_options_auth_all" on product_variant_options
  for all to authenticated using (true) with check (true);

-- Anon — read only (landing pages)
create policy "product_options_anon_read" on product_options
  for select to anon using (true);
create policy "product_option_values_anon_read" on product_option_values
  for select to anon using (true);
create policy "product_variants_anon_read" on product_variants
  for select to anon using (true);
create policy "product_variant_options_anon_read" on product_variant_options
  for select to anon using (true);
