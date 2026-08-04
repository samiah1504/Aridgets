-- Gapless order numbers.
-- The old Postgres sequence consumed numbers on failed inserts and could skip
-- a batch after a database restart. Numbers now come from a transactional
-- counter in settings: if an insert fails, the increment rolls back with it —
-- no gaps, ever.

alter table public.settings add column if not exists order_seq bigint not null default 0;

-- Start from the highest number ever issued
update public.settings
set order_seq = greatest(
  order_seq,
  coalesce((
    select max(nullif(regexp_replace(order_number, '^.*-', ''), '')::bigint)
    from public.leads
  ), 0)
);

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
   where id = (select id from public.settings limit 1)
   returning order_prefix, order_seq into v_prefix, v_seq;

  if v_seq is null then
    -- no settings row: fall back to the legacy sequence
    v_prefix := 'AR';
    v_seq := nextval('public.lead_order_seq');
  end if;

  return coalesce(v_prefix, 'AR') || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

-- Close the bot hole: the leads table no longer accepts direct anonymous
-- inserts through the public REST API. Orders go only through the website's
-- /api/leads endpoint (which validates input and uses the service role).
drop policy if exists "public_insert_leads" on public.leads;
