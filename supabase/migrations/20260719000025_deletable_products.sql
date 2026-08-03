-- Allow deleting a product that already has leads.
-- Leads are business records and must survive: the product link is cleared
-- instead of blocking the delete (lead pages already handle a missing product).

alter table public.leads alter column product_id drop not null;

alter table public.leads drop constraint if exists leads_product_id_fkey;
alter table public.leads add constraint leads_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;
