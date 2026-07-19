-- Add landing-page template type to products
alter table products
  add column if not exists template_type text not null default 'gadget'
    constraint products_template_type_check
      check (template_type in ('furniture', 'gadget', 'kids_toy', 'kids_fashion'));
