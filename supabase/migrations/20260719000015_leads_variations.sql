-- Store selected variant and option choices with each lead
alter table leads
  add column if not exists variant_id uuid references product_variants(id) on delete set null,
  add column if not exists selected_options jsonb;
