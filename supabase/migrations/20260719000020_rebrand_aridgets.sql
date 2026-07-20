-- Rebrand: Crift Shop → Aridgets
-- New orders use the AR- prefix (configurable via settings.order_prefix);
-- existing order numbers are left untouched.

update public.settings set business_name = 'Aridgets' where business_name = 'Crift Shop';
update public.settings set order_prefix = 'AR' where order_prefix in ('CS', 'DD');

alter table public.settings alter column business_name set default 'Aridgets';

-- Fallback prefix when settings is empty
create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_seq    bigint;
begin
  select order_prefix into v_prefix from public.settings limit 1;
  v_prefix := coalesce(v_prefix, 'AR');
  v_seq    := nextval('public.lead_order_seq');
  return v_prefix || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

-- Update any product footer text that mentions the old brand
update public.products
set content = jsonb_set(
  content,
  '{footerText}',
  to_jsonb(replace(content->>'footerText', 'Crift Shop', 'Aridgets'))
)
where content->>'footerText' like '%Crift Shop%';
