-- Fix: duplicate rows in settings made the gapless order counter flip
-- between rows — different orders drew the same number and every insert
-- failed on the unique order_number constraint.

-- Keep exactly one settings row
delete from public.settings
where id not in (select id from public.settings order by id limit 1);

-- Re-sync the counter to the highest number ever issued
update public.settings
set order_seq = greatest(order_seq, coalesce((
  select max(nullif(regexp_replace(order_number, '^.*-', ''), '')::bigint)
  from public.leads
), 0));

-- Deterministic row selection in the generator
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
  update public.settings
     set order_seq = order_seq + 1
   where id = (select id from public.settings order by id limit 1)
   returning order_prefix, order_seq into v_prefix, v_seq;

  if v_seq is null then
    v_prefix := 'AR';
    v_seq := nextval('public.lead_order_seq');
  end if;

  return coalesce(v_prefix, 'AR') || '-' || lpad(v_seq::text, 6, '0');
end;
$$;
